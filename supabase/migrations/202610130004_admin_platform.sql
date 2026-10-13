begin;
-- Platform administration uses the existing trusted grant and immutable audit.
alter table private.accounts add column status text not null default 'active' check(status in('active','suspended'));
alter table private.accounts add column status_reason text;
create table private.account_roles(user_id uuid not null references auth.users(id) on delete cascade,role text not null check(role in('tenant','landlord')),created_at timestamptz not null default now(),primary key(user_id,role));
alter table private.account_roles enable row level security;
revoke all on private.account_roles from public,anon,authenticated,service_role;
insert into private.account_roles(user_id,role,created_at) select a.user_id,'tenant',u.created_at from private.accounts a join auth.users u on u.id=a.user_id;
insert into private.account_roles(user_id,role,created_at) select user_id,'landlord',min(created_at) from private.claims group by user_id;
create function private.track_account_roles() returns trigger language plpgsql security definer set search_path='' as $$begin insert into private.account_roles(user_id,role) values(new.user_id,case when tg_table_name='claims' then 'landlord' else 'tenant' end) on conflict do nothing;return new;end;$$;
create trigger account_role after insert on private.accounts for each row execute function private.track_account_roles();
create trigger claimant_role after insert on private.claims for each row execute function private.track_account_roles();
create function private.account_active(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.accounts where user_id=p_user and status='active')$$;
create function public.get_my_account_status() returns text language sql stable security definer set search_path='' as $$select status from private.accounts where user_id=auth.uid()$$;
create or replace function public.is_administrator() returns boolean language sql stable security definer set search_path='' as $$select private.account_active(auth.uid()) and exists(select 1 from private.administrator_grants where user_id=auth.uid())$$;
-- Suspended sessions cannot bypass the UI by calling business mutation RPCs.
create function private.enforce_active_session() returns trigger language plpgsql security definer set search_path='' as $$begin if auth.uid() is not null and not private.account_active(auth.uid()) then raise exception 'Account suspended: platform changes are disabled' using errcode='42501';end if;return new;end;$$;
do $$declare target text;begin foreach target in array array['public.properties','public.reviews','public.replies','public.public_profiles','private.tenancies','private.claims','private.verification_requests','private.reports','private.photo_reports','private.messages','private.message_reports','private.conversations','private.contact_preferences','private.saved_properties'] loop execute format('create trigger active_session before insert or update on %s for each row execute function private.enforce_active_session()',target);end loop;end;$$;
create function private.enforce_active_document_owner() returns trigger language plpgsql security definer set search_path='' as $$begin if not private.account_active(new.owner_id) then raise exception 'Suspended accounts cannot upload evidence' using errcode='42501';end if;return new;end;$$;
create trigger active_document_owner before insert on private.documents for each row execute function private.enforce_active_document_owner();
alter table public.reviews drop constraint reviews_status_check;
alter table public.reviews add constraint reviews_status_check check(status in('visible','hidden','deleted','removed'));
alter table private.verification_requests drop constraint verification_requests_status_check;
alter table private.verification_requests add constraint verification_requests_status_check check(status in('pending','approved','rejected','revoked','disputed'));

create table private.platform_cases(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in('property','tenant','landlord','review','account')),
 target_id uuid not null,submitted_by uuid references auth.users(id) on delete set null,
 reason text not null check(char_length(btrim(reason)) between 10 and 2000),
 status text not null default 'open' check(status in('open','under_review','awaiting_information','escalated','resolved')),
 assigned_to uuid references auth.users(id) on delete set null,resolution text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index platform_case_queue on private.platform_cases(status,created_at);
create unique index one_open_platform_case on private.platform_cases(kind,target_id) where status<>'resolved';
create table private.admin_notes(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('tenant','landlord','case','property','review','account')),target_id uuid not null,actor_id uuid references auth.users(id) on delete set null,body text not null check(char_length(btrim(body)) between 10 and 2000),created_at timestamptz not null default now());
alter table private.platform_cases enable row level security;alter table private.admin_notes enable row level security;
revoke all on private.platform_cases,private.admin_notes from public,anon,authenticated,service_role;
create function private.validate_admin_target(p_kind text,p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select case p_kind when 'property' then exists(select 1 from public.properties where id=p_id) when 'review' then exists(select 1 from public.reviews where id=p_id) when 'account' then exists(select 1 from private.accounts where user_id=p_id) when 'tenant' then exists(select 1 from private.verification_requests where id=p_id) when 'landlord' then exists(select 1 from private.claims where id=p_id) when 'case' then exists(select 1 from private.platform_cases where id=p_id) else false end$$;
create function public.submit_platform_case(p_kind text,p_target uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;permitted boolean;
begin
 if auth.uid() is null or not private.account_active(auth.uid()) then raise exception 'Active account required' using errcode='42501';end if;
 perform private.catalogue_lock();
 if not private.validate_admin_target(p_kind,p_target) or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Choose a valid record and explain the issue';end if;
 permitted:=public.is_administrator() or (p_kind='property' and exists(select 1 from public.properties where id=p_target and status='published')) or (p_kind='review' and exists(select 1 from public.reviews r join private.tenancies t on t.id=r.tenancy_id where r.id=p_target and t.user_id=auth.uid())) or (p_kind in('tenant','landlord') and exists(select 1 from private.verification_applications where id=p_target and kind=p_kind and applicant_id=auth.uid()));
 if not permitted then raise exception 'Cannot open a case for this record' using errcode='42501';end if;
 select id into result from private.platform_cases where kind=p_kind and target_id=p_target and status<>'resolved';
 if result is not null then raise exception 'An open investigation already exists for this record';end if;
 insert into private.platform_cases(kind,target_id,submitted_by,reason) values(p_kind,p_target,auth.uid(),btrim(p_reason)) returning id into result;
 insert into private.audit_events(actor_id,action,entity_id,reason,after_value) values(auth.uid(),'case_opened',result,btrim(p_reason),jsonb_build_object('kind',p_kind,'target',p_target));
 insert into private.notifications(user_id,kind,message,href) values(auth.uid(),'case','Your report or appeal has been submitted.','/account/appeals');
 return result;
end;$$;
-- Disputed verification decisions automatically join the centralized queue.
create function private.sync_dispute_case() returns trigger language plpgsql security definer set search_path='' as $$
declare case_id uuid;applicant uuid;case_kind text:=case when tg_table_name='claims' then 'landlord' else 'tenant' end;
begin
 if new.status='disputed' and (tg_op='INSERT' or old.status is distinct from new.status) then
  insert into private.platform_cases(kind,target_id,submitted_by,reason) values(case_kind,new.id,auth.uid(),coalesce(new.reason,'Conflicting evidence or property authority requires investigation')) on conflict(kind,target_id) where status<>'resolved' do nothing;
 end if;
 if tg_op='UPDATE' and old.status='disputed' and new.status in('approved','rejected','revoked') then
  for case_id in select id from private.platform_cases where kind=case_kind and target_id=new.id and status<>'resolved' loop
   update private.platform_cases set status='resolved',resolution=new.reason,updated_at=now() where id=case_id;
   insert into private.audit_events(actor_id,action,entity_id,reason,after_value) values(auth.uid(),'case_resolved',case_id,coalesce(new.reason,'Verification dispute resolved by evidence decision'),jsonb_build_object('verification_status',new.status));
  end loop;
 end if;
 return new;
end;$$;
create trigger claim_dispute_case after insert or update of status on private.claims for each row execute function private.sync_dispute_case();
create trigger tenant_dispute_case after insert or update of status on private.verification_requests for each row execute function private.sync_dispute_case();
insert into private.platform_cases(kind,target_id,reason) select kind,id,coalesce(reason,'Existing verification dispute requires investigation') from private.verification_applications where backend_status='disputed';
alter function public.decide_verification(uuid,text,text,jsonb) set schema private;
alter function private.decide_verification(uuid,text,text,jsonb) rename to decide_verification_before_platform;
create function public.decide_verification(p_request uuid,p_decision text,p_reason text,p_checks jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 perform private.require_administrator();perform private.catalogue_lock();
 select status into previous from private.verification_requests where id=p_request for update;
 if previous is null or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Valid application and reason required';end if;
 if p_decision='disputed' then
  if previous not in('pending','approved') then raise exception 'Only active verification can be disputed';end if;
  update private.verification_requests set status='disputed',reason=btrim(p_reason),decided_by=auth.uid(),decided_at=now() where id=p_request;
  insert into private.audit_events(actor_id,action,entity_id,reason,before_value,after_value) values(auth.uid(),'verification_disputed',p_request,btrim(p_reason),jsonb_build_object('status',previous),jsonb_build_object('status','disputed'));
 else
  if previous='disputed' then
   if p_decision not in('approved','rejected','revoked') then raise exception 'Choose a dispute resolution';end if;
   update private.verification_requests set status=case when p_decision='revoked' then 'approved' else 'pending' end where id=p_request;
  end if;
  perform private.decide_verification_before_platform(p_request,p_decision,p_reason,p_checks);
  if previous='disputed' then update private.platform_cases set status='resolved',resolution=btrim(p_reason),updated_at=now() where kind='tenant' and target_id=p_request and status<>'resolved';end if;
 end if;
end;$$;

create function public.admin_platform_action(p_kind text,p_target uuid,p_action text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare previous text;owner uuid;profile uuid;target_kind text;linked uuid;
begin
 perform private.require_administrator();perform private.catalogue_lock();
 if not private.validate_admin_target(p_kind,p_target) or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'A valid record and reason of 10–2000 characters are required';end if;
 if p_action='note' then
  insert into private.admin_notes(kind,target_id,actor_id,body) values(p_kind,p_target,auth.uid(),btrim(p_reason));
 elsif p_kind='property' and p_action in('hidden','published') then
  select status into previous from public.properties where id=p_target for update;
  if previous='merged' then raise exception 'Merged properties cannot be reactivated';end if;
  update public.properties set status=p_action,updated_at=now() where id=p_target;
 elsif p_kind='account' and p_action in('suspended','active') then
  if p_target=auth.uid() or exists(select 1 from private.administrator_grants where user_id=p_target) then raise exception 'Administrator accounts cannot be suspended here; use the trusted permissions operator' using errcode='42501';end if;
  select status into previous from private.accounts where user_id=p_target for update;
  update private.accounts set status=p_action,status_reason=btrim(p_reason) where user_id=p_target;
  owner:=p_target;
 elsif p_kind='review' and p_action in('hidden','visible','removed') then
  select r.status,t.user_id into previous,owner from public.reviews r join private.tenancies t on t.id=r.tenancy_id where r.id=p_target for update of r;
  if previous in('deleted','removed') then raise exception 'Deleted or permanently removed reviews cannot be republished';end if;
  if p_action='visible' and previous<>'hidden' then raise exception 'Only temporarily hidden reviews can be restored';end if;
  update public.reviews set status=p_action,updated_at=now() where id=p_target;
 elsif p_kind='case' and p_action in('assign','request_information','escalated','resolved') then
  select status,submitted_by,kind,target_id into previous,owner,target_kind,linked from private.platform_cases where id=p_target for update;
  if previous='resolved' then raise exception 'This investigation is already resolved';end if;
  if p_action='resolved' and target_kind in('tenant','landlord') and exists(select 1 from private.verification_applications where id=linked and kind=target_kind and backend_status='disputed') then raise exception 'Resolve the verification decision before closing its dispute';end if;
  update private.platform_cases set status=case p_action when 'assign' then 'under_review' when 'request_information' then 'awaiting_information' else p_action end,assigned_to=auth.uid(),resolution=case when p_action='resolved' then btrim(p_reason) else resolution end,updated_at=now() where id=p_target;
 else raise exception 'Unsupported administrative action';end if;
 insert into private.audit_events(actor_id,action,entity_id,reason,before_value,after_value) values(auth.uid(),p_kind||'_'||p_action,p_target,btrim(p_reason),jsonb_build_object('status',previous),jsonb_build_object('action',p_action));
 if owner is not null and p_action<>'note' then insert into private.notifications(user_id,kind,message,href) values(owner,'administration','Administrative update: '||replace(p_action,'_',' ')||'. '||btrim(p_reason),case when p_kind='review' then '/account/reviews' else '/account/appeals' end);end if;
end;$$;
create function public.get_admin_notes(p_kind text,p_target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform private.require_administrator();return(select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'body',n.body,'created_at',n.created_at,'actor',p.public_alias) order by n.created_at desc),'[]'::jsonb) from private.admin_notes n left join private.accounts a on a.user_id=n.actor_id left join public.public_profiles p on p.id=a.public_profile_id where n.kind=p_kind and n.target_id=p_target);end;$$;
create function public.get_my_platform_cases() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'target_id',target_id,'status',status,'reason',reason,'resolution',resolution,'created_at',created_at) order by created_at desc),'[]'::jsonb) from private.platform_cases where submitted_by=auth.uid()$$;
create function public.respond_platform_case(p_case uuid,p_message text) returns void language plpgsql security definer set search_path='' as $$begin if not private.account_active(auth.uid()) then raise exception 'Active account required' using errcode='42501';end if;if p_message is null or char_length(btrim(p_message)) not between 10 and 2000 then raise exception 'Explain your response in 10–2000 characters';end if;update private.platform_cases set status='under_review',updated_at=now() where id=p_case and submitted_by=auth.uid() and status='awaiting_information';if not found then raise exception 'Case is not awaiting your response' using errcode='42501';end if;insert into private.audit_events(actor_id,action,entity_id,reason) values(auth.uid(),'case_applicant_response',p_case,btrim(p_message));end;$$;

create view private.admin_platform_records as
select 'properties'::text kind,p.id,p.name title,p.name||' '||p.address||' '||p.city||' '||p.state search,p.status,p.created_at,
 jsonb_build_object('id',p.id,'name',p.name,'address',p.address,'city',p.city,'rent_min',p.rent_min,'rent_max',p.rent_max,'status',p.status,'is_demo',p.is_demo,'created_at',p.created_at,'rating',(select round(avg(r.property_rating),1) from public.reviews r where r.property_id=p.id and r.status='visible'),'reviews',(select count(*) from public.reviews r where r.property_id=p.id),'verified_reviews',(select count(*) from public.reviews r where r.property_id=p.id and r.status='visible' and public.review_is_verified(r.id) and not r.is_demo),'landlord',(select string_agg(pp.public_alias,', ') from private.claims c join private.accounts a on a.user_id=c.user_id join public.public_profiles pp on pp.id=a.public_profile_id where c.property_id=p.id and c.status='approved'),'verified',exists(select 1 from private.claims c join private.documents d on d.id=c.document_id where c.property_id=p.id and c.status='approved' and not d.is_demo),'claims',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'status',c.status)),'[]'::jsonb) from private.claims c where c.property_id=p.id)) payload from public.properties p
union all
select 'users',u.id,pp.public_alias,pp.public_alias||' '||coalesce(u.email,'')||' '||u.id::text,a.status,u.created_at,
 jsonb_build_object('id',u.id,'name',pp.public_alias,'email',u.email,'created_at',u.created_at,'status',a.status,'roles',(select jsonb_agg(role) from private.account_roles where user_id=u.id),'admin',exists(select 1 from private.administrator_grants where user_id=u.id),'tenant_verified',exists(select 1 from private.verification_applications where applicant_id=u.id and kind='tenant' and backend_status='approved' and not is_demo),'landlord_verified',exists(select 1 from private.verification_applications where applicant_id=u.id and kind='landlord' and backend_status='approved' and not is_demo),'reviews',(select count(*) from public.reviews r where r.profile_id=pp.id),'claims',(select count(*) from private.claims c where c.user_id=u.id),'properties',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'claim',c.id,'status',c.status)),'[]'::jsonb) from private.claims c join public.properties p on p.id=c.property_id where c.user_id=u.id),'report_count',(select count(*) from private.reports reports join public.reviews r on r.id=reports.review_id where r.profile_id=pp.id)) from auth.users u join private.accounts a on a.user_id=u.id join public.public_profiles pp on pp.id=a.public_profile_id
union all
select 'reviews',r.id,pp.public_alias||' · '||p.name,pp.public_alias||' '||p.name||' '||r.body,r.status,r.created_at,
 jsonb_build_object('id',r.id,'name',pp.public_alias,'body',r.body,'property_id',p.id,'property',p.name,'created_at',r.created_at,'status',r.status,'rating',r.property_rating,'verified',public.review_is_verified(r.id) and not r.is_demo,'is_demo',r.is_demo,'reports',(select count(*) from private.reports where review_id=r.id),'pending_reports',(select count(*) from private.reports where review_id=r.id and status='pending'),'photos',(select coalesce(jsonb_agg(jsonb_build_object('id',id)),'[]'::jsonb) from private.review_photos where review_id=r.id and status='visible'),'replies',(select coalesce(jsonb_agg(jsonb_build_object('id',reply.id,'name',ppr.public_alias,'body',reply.body)),'[]'::jsonb) from public.replies reply join public.public_profiles ppr on ppr.id=reply.profile_id where reply.review_id=r.id)) from public.reviews r join public.properties p on p.id=r.property_id join public.public_profiles pp on pp.id=r.profile_id
union all
select 'cases',c.id,coalesce(p.name,app.property,rp.name,pp.public_alias,'Platform investigation'),c.reason||' '||coalesce(p.name,app.property,rp.name,pp.public_alias,'')||' '||c.target_id::text,c.status,c.created_at,
 jsonb_build_object('id',c.id,'name',coalesce(p.name,app.property,rp.name,pp.public_alias,'Platform investigation'),'kind',c.kind,'target_id',c.target_id,'reason',c.reason,'status',c.status,'created_at',c.created_at,'assigned',reviewer.public_alias,'resolution',c.resolution) from private.platform_cases c left join public.properties p on c.kind='property' and p.id=c.target_id left join private.verification_applications app on c.kind=app.kind and app.id=c.target_id left join public.reviews r on c.kind='review' and r.id=c.target_id left join public.properties rp on rp.id=r.property_id left join private.accounts a on c.kind='account' and a.user_id=c.target_id left join public.public_profiles pp on pp.id=a.public_profile_id left join private.accounts ra on ra.user_id=c.assigned_to left join public.public_profiles reviewer on reviewer.id=ra.public_profile_id;
revoke all on private.admin_platform_records from public,anon,authenticated,service_role;

create function public.get_admin_platform_list(p_kind text,p_filters jsonb default '{}'::jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;q text:=left(coalesce(p_filters->>'query',''),120);page_number integer:=coalesce((p_filters->>'page')::integer,1);sort_order text:=coalesce(p_filters->>'sort','newest');
begin
 perform private.require_administrator();
 if p_kind not in('properties','users','reviews','cases') or page_number not between 1 and 100000 or sort_order not in('newest','oldest','name','rating') then raise exception 'Invalid management filters';end if;
 with filtered as(select * from private.admin_platform_records rec where rec.kind=p_kind and (q='' or strpos(lower(rec.search),lower(q))>0) and (coalesce(p_filters->>'id','')='' or rec.id::text=p_filters->>'id') and (coalesce(p_filters->>'status','')='' or rec.status=p_filters->>'status') and (coalesce(p_filters->>'city','')='' or rec.payload->>'city'=p_filters->>'city') and (coalesce(p_filters->>'role','')='' or rec.payload->'roles' ? (p_filters->>'role')) and (coalesce(p_filters->>'verified','')='' or coalesce(rec.payload->>'verified',rec.payload->>'tenant_verified','false')=p_filters->>'verified') and (coalesce(p_filters->>'landlord_verified','')='' or rec.payload->>'landlord_verified'=p_filters->>'landlord_verified') and (coalesce(p_filters->>'flagged','')<>'true' or (rec.payload->>'pending_reports')::integer>0) and (coalesce(p_filters->>'rating','')='' or (rec.payload->>'rating')::numeric>= (p_filters->>'rating')::numeric) and (coalesce(p_filters->>'from','')='' or rec.created_at::date>=(p_filters->>'from')::date) and (coalesce(p_filters->>'to','')='' or rec.created_at::date<=(p_filters->>'to')::date)),
 paged as(select * from filtered order by case when sort_order='name' then lower(title) end,case when sort_order='rating' then (payload->>'rating')::numeric end desc nulls last,case when sort_order='oldest' then created_at end asc,case when sort_order='newest' then created_at end desc,id limit 20 offset (page_number-1)*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(payload) from paged),'[]'::jsonb),'total',(select count(*) from filtered),'page',page_number,'cities',(select jsonb_agg(city) from(select distinct city from public.properties order by city)c)) into result;return result;
end;$$;

create function public.get_admin_platform_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_administrator();
 select jsonb_build_object('properties',(select count(*) from public.properties where status<>'merged'),'tenants',(select count(*) from private.account_roles where role='tenant'),'landlords',(select count(*) from private.account_roles where role='landlord'),'verified_tenants',(select count(distinct applicant_id) from private.verification_applications where kind='tenant' and backend_status='approved' and not is_demo),'verified_landlords',(select count(distinct applicant_id) from private.verification_applications where kind='landlord' and backend_status='approved' and not is_demo),'verified_claims',(select count(*) from private.verification_applications where kind='landlord' and backend_status='approved' and not is_demo),'pending',(select count(*) from private.verification_applications where backend_status='pending'),'tenant_pending',(select count(*) from private.verification_applications where kind='tenant' and backend_status='pending'),'landlord_pending',(select count(*) from private.verification_applications where kind='landlord' and backend_status='pending'),'reviews',(select count(*) from public.reviews),'flagged',(select count(distinct review_id) from private.reports where status='pending'),'disputes',(select count(*) from private.platform_cases where status<>'resolved'),'overdue',(select count(*) from private.verification_applications where backend_status='pending' and created_at<now()-interval '7 days'),'oldest',(select min(created_at) from private.verification_applications where backend_status='pending'),'verification_states',(select coalesce(jsonb_agg(jsonb_build_object('label',status,'count',n)),'[]'::jsonb) from(select status,count(*) n from private.verification_applications group by status order by status)s),'cities',(select coalesce(jsonb_agg(jsonb_build_object('label',city,'count',n) order by n desc),'[]'::jsonb) from(select city,count(*) n from public.properties where status<>'merged' group by city order by count(*) desc limit 8)s),'trends',
 (select jsonb_agg(jsonb_build_object('month',to_char(month,'Mon YYYY'),'properties',(select count(*) from public.properties where created_at>=month and created_at<month+interval '1 month'),'tenants',(select count(*) from private.account_roles where role='tenant' and created_at>=month and created_at<month+interval '1 month'),'landlords',(select count(*) from private.account_roles where role='landlord' and created_at>=month and created_at<month+interval '1 month'),'reviews',(select count(*) from public.reviews where created_at>=month and created_at<month+interval '1 month'),'flagged',(select count(*) from private.reports where created_at>=month and created_at<month+interval '1 month')) order by month) from generate_series(date_trunc('month',now())-interval '5 months',date_trunc('month',now()),interval '1 month')month)) into result;return result;
end;$$;

create function public.get_admin_review_photo(p_photo uuid) returns text language plpgsql stable security definer set search_path='' as $$begin perform private.require_administrator();return(select object_path from private.review_photos where id=p_photo and status='visible');end;$$;
create function public.record_admin_document_access(p_document uuid) returns void language plpgsql security definer set search_path='' as $$begin perform private.require_administrator();if not exists(select 1 from private.documents where id=p_document and object_path is not null and deleted_at is null and expires_at>now()) then raise exception 'Document unavailable';end if;insert into private.audit_events(actor_id,action,entity_id,reason) values(auth.uid(),'document_access',p_document,'Administrator opened a private verification document');end;$$;
create function private.audit_admin_permission() returns trigger language plpgsql security definer set search_path='' as $$begin insert into private.audit_events(actor_id,action,entity_id,reason,before_value,after_value) values(auth.uid(),'administrator_permissions',case when tg_op='DELETE' then old.user_id else new.user_id end,'Trusted database operator changed administrator permissions',case when tg_op<>'INSERT' then jsonb_build_object('granted',true) end,jsonb_build_object('granted',tg_op<>'DELETE'));if tg_op='DELETE' then return old;end if;return new;end;$$;
create trigger administrator_permission_audit after insert or update or delete on private.administrator_grants for each row execute function private.audit_admin_permission();
revoke all on function private.track_account_roles(),private.account_active(uuid),private.enforce_active_session(),private.enforce_active_document_owner(),private.validate_admin_target(text,uuid),private.sync_dispute_case(),private.audit_admin_permission(),private.decide_verification_before_platform(uuid,text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.get_my_account_status(),public.submit_platform_case(text,uuid,text),public.decide_verification(uuid,text,text,jsonb),public.admin_platform_action(text,uuid,text,text),public.get_admin_notes(text,uuid),public.get_my_platform_cases(),public.respond_platform_case(uuid,text),public.get_admin_platform_list(text,jsonb),public.get_admin_platform_overview(),public.get_admin_review_photo(uuid),public.record_admin_document_access(uuid) from public,anon;
grant execute on function public.get_my_account_status(),public.submit_platform_case(text,uuid,text),public.decide_verification(uuid,text,text,jsonb),public.admin_platform_action(text,uuid,text,text),public.get_admin_notes(text,uuid),public.get_my_platform_cases(),public.respond_platform_case(uuid,text),public.get_admin_platform_list(text,jsonb),public.get_admin_platform_overview(),public.get_admin_review_photo(uuid),public.record_admin_document_access(uuid) to authenticated;
commit;
