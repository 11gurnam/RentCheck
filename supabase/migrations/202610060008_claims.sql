begin;
create table private.claims(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),property_id uuid references public.properties(id),landlord_id uuid references public.landlords(id),document_id uuid not null unique references private.documents(id),status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),reason text,decided_by uuid,created_at timestamptz not null default now(),decided_at timestamptz,check(num_nonnulls(property_id,landlord_id)=1));
create unique index claim_account_property_active on private.claims(user_id,property_id) where status in ('pending','approved') and property_id is not null;
create unique index claim_account_landlord_active on private.claims(user_id,landlord_id) where status in ('pending','approved') and landlord_id is not null;
create unique index one_approved_property_claim on private.claims(property_id) where status='approved';
create unique index one_approved_landlord_claim on private.claims(landlord_id) where status='approved';
alter table private.claims enable row level security;revoke all on private.claims from public,anon,authenticated;
create table public.replies(id uuid primary key default gen_random_uuid(),claim_id uuid not null references private.claims(id),review_id uuid not null references public.reviews(id),profile_id uuid not null references public.public_profiles(id),body text not null check(char_length(btrim(body)) between 10 and 3000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(claim_id,review_id));
alter table public.replies enable row level security;revoke all on public.replies from public,anon,authenticated;
create or replace function private.user_owns_property(p_user uuid,p_property uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from private.property_contributors where property_id=p_property and user_id=p_user and declared_owner) or exists(select 1 from private.claims c where c.user_id=p_user and c.status='approved' and (c.property_id=p_property or c.landlord_id in(select landlord_id from public.management_associations where property_id=p_property)));
$$;
create function public.register_claim_document(p_user uuid,p_property uuid,p_landlord uuid,p_document uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare path text:='claim/'||p_document::text||'.jpg';cid uuid;
begin
if not exists(select 1 from private.accounts where user_id=p_user) or num_nonnulls(p_property,p_landlord)<>1 then raise exception 'Choose one valid claim target';end if;
if p_property is not null and not exists(select 1 from public.properties where id=p_property and status='published') or p_landlord is not null and not exists(select 1 from public.landlords where id=p_landlord and status='published') then raise exception 'Claim target unavailable';end if;
perform pg_advisory_xact_lock(hashtextextended(p_user::text||'|claim|'||coalesce(p_property,p_landlord)::text,0));
if exists(select 1 from private.claims where user_id=p_user and status in ('pending','approved') and (property_id=p_property or landlord_id=p_landlord)) then raise exception 'You already have an active claim for this profile';end if;
if not exists(select 1 from storage.objects where bucket_id='rental-documents' and name=path) then raise exception 'Evidence not uploaded';end if;
insert into private.documents(id,owner_id,object_path) values(p_document,p_user,path);
insert into private.claims(user_id,property_id,landlord_id,document_id) values(p_user,p_property,p_landlord,p_document) returning id into cid;return cid;end;$$;
revoke all on function public.register_claim_document(uuid,uuid,uuid,uuid) from public,anon,authenticated;grant execute on function public.register_claim_document(uuid,uuid,uuid,uuid) to service_role;
create function public.get_my_claims() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'property_id',c.property_id,'landlord_id',c.landlord_id,'name',coalesce(p.name,l.name),'document_id',c.document_id,'status',c.status,'reason',c.reason) order by c.created_at desc),'[]'::jsonb) from private.claims c left join public.properties p on p.id=c.property_id left join public.landlords l on l.id=c.landlord_id where c.user_id=auth.uid();
$$;
create function public.get_admin_claims() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();return(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'property_id',c.property_id,'landlord_id',c.landlord_id,'name',coalesce(p.name,l.name),'alias',profile.public_alias,'document_id',c.document_id,'status',c.status,'reason',c.reason) order by c.created_at),'[]'::jsonb) from private.claims c join private.accounts a on a.user_id=c.user_id join public.public_profiles profile on profile.id=a.public_profile_id left join public.properties p on p.id=c.property_id left join public.landlords l on l.id=c.landlord_id);end;$$;
create function public.decide_claim(p_claim uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare c private.claims%rowtype;pid uuid;
begin perform private.require_administrator();
if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Enter a decision reason of 10 to 2000 characters';end if;
select * into c from private.claims where id=p_claim for update;
if c.id is null or not ((c.status='pending' and p_decision in ('approved','rejected')) or (c.status='approved' and p_decision='revoked')) then raise exception 'Invalid claim transition';end if;
if p_decision='approved' then
for pid in select id from public.properties where id=c.property_id or id in(select property_id from public.management_associations where landlord_id=c.landlord_id) order by id loop
perform pg_advisory_xact_lock(hashtextextended(c.user_id::text||'|'||pid::text,0));
end loop;
if exists(select 1 from private.tenancies t join public.reviews r on r.tenancy_id=t.id where t.user_id=c.user_id and r.status='visible' and (t.property_id=c.property_id or t.property_id in(select property_id from public.management_associations where landlord_id=c.landlord_id))) then raise exception 'Resolve the claimant’s visible tenant reviews before approving this claim. Do not silently remove them.';end if;
if exists(select 1 from private.claims other where other.id<>c.id and other.status='approved' and (other.property_id=c.property_id or other.landlord_id=c.landlord_id)) then raise exception 'Another representative is approved. Explicitly revoke that claim first.';end if;
end if;
update private.claims set status=p_decision,reason=btrim(p_reason),decided_by=auth.uid(),decided_at=now() where id=c.id;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'claim_decision',c.id,jsonb_build_object('status',c.status),jsonb_build_object('status',p_decision),btrim(p_reason));end;$$;
create function public.update_claimed_details(p_claim uuid,p_input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare c private.claims%rowtype;previous jsonb;new_value jsonb;reason text:=btrim(p_input->>'reason');
begin
select * into c from private.claims where id=p_claim and user_id=auth.uid() and status='approved' for update;
if c.id is null then raise exception 'Approved matching claim required' using errcode='42501';end if;
if reason is null or char_length(reason) not between 10 and 2000 or exists(select 1 from jsonb_object_keys(p_input) k where k not in ('name','description','min','max','reason')) then raise exception 'Only permitted details and an audit reason are allowed';end if;
if c.property_id is not null then
select to_jsonb(p) into previous from public.properties p where id=c.property_id and status='published' for update;if previous is null then raise exception 'Profile unavailable';end if;
update public.properties set name=btrim(p_input->>'name'),description=coalesce(p_input->>'description',''),rent_min=(p_input->>'min')::integer,rent_max=(p_input->>'max')::integer,updated_at=now() where id=c.property_id returning to_jsonb(properties.*) into new_value;
else
if p_input ? 'min' or p_input ? 'max' then raise exception 'Rent fields belong to property claims';end if;
select to_jsonb(l) into previous from public.landlords l where id=c.landlord_id and status='published' for update;if previous is null then raise exception 'Profile unavailable';end if;
update public.landlords set name=btrim(p_input->>'name'),description=coalesce(p_input->>'description','') where id=c.landlord_id returning to_jsonb(landlords.*) into new_value;
end if;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'claimed_details',coalesce(c.property_id,c.landlord_id),previous,new_value,reason);end;$$;
create function public.upsert_claimant_reply(p_claim uuid,p_review uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
declare c private.claims%rowtype;r public.reviews%rowtype;old_body text;rid uuid;
begin
select * into c from private.claims where id=p_claim and user_id=auth.uid() and status='approved' for update;if c.id is null then raise exception 'Approved matching claim required' using errcode='42501';end if;
select * into r from public.reviews where id=p_review and status='visible' and exists(select 1 from public.properties p where p.id=reviews.property_id and p.status='published');
if r.id is null or not (r.property_id=c.property_id or r.landlord_id=c.landlord_id) is true then raise exception 'Claim does not match this tenancy review' using errcode='42501';end if;
if p_body is null or char_length(btrim(p_body)) not between 10 and 3000 then raise exception 'Reply needs 10 to 3000 characters';end if;
select body into old_body from public.replies where claim_id=c.id and review_id=r.id;
insert into public.replies(claim_id,review_id,profile_id,body) values(c.id,r.id,(select public_profile_id from private.accounts where user_id=auth.uid()),btrim(p_body)) on conflict(claim_id,review_id) do update set body=excluded.body,updated_at=now() returning id into rid;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'claimant_reply',rid,jsonb_build_object('body',old_body),jsonb_build_object('body',btrim(p_body)),'Claimant saved their own public reply');end;$$;
create function public.get_claimant_replies(p_review uuid) returns table(id uuid,body text,alias text,representative text,created_at timestamptz,updated_at timestamptz) language sql stable security definer set search_path='' as $$
select reply.id,reply.body,profile.public_alias,case when c.property_id is not null then 'Property representative' else 'Manager representative: '||l.name end,reply.created_at,reply.updated_at from public.replies reply join private.claims c on c.id=reply.claim_id join public.public_profiles profile on profile.id=reply.profile_id join public.reviews r on r.id=reply.review_id join public.properties p on p.id=r.property_id left join public.landlords l on l.id=c.landlord_id where reply.review_id=p_review and c.status='approved' and r.status='visible' and p.status='published' and (c.property_id=r.property_id or c.landlord_id=r.landlord_id);
$$;
revoke all on function public.get_my_claims(),public.get_admin_claims(),public.decide_claim(uuid,text,text),public.update_claimed_details(uuid,jsonb),public.upsert_claimant_reply(uuid,uuid,text) from public,anon;
grant execute on function public.get_my_claims(),public.get_admin_claims(),public.decide_claim(uuid,text,text),public.update_claimed_details(uuid,jsonb),public.upsert_claimant_reply(uuid,uuid,text) to authenticated;
revoke all on function public.get_claimant_replies(uuid) from public;grant execute on function public.get_claimant_replies(uuid) to anon,authenticated;

create or replace function public.create_review(p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();pid uuid:=(p_input->>'property')::uuid;start_day date:=(p_input->>'start')::date;end_day date:=nullif(p_input->>'end','')::date;is_now boolean:=(p_input->>'current')::boolean;paid integer:=(p_input->>'paid')::integer;pr smallint:=(p_input->>'propertyRating')::smallint;lr smallint:=nullif(p_input->>'managerRating','')::smallint;words text:=btrim(p_input->>'body');tid uuid;rid uuid;existing private.tenancies%rowtype;assoc public.management_associations%rowtype;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_input->>'synthetic' is distinct from 'true' then raise exception 'Only fictional tenancy examples allowed';end if;
 if not exists(select 1 from public.properties where id=pid and status='published') then raise exception 'Property unavailable';end if;
 if private.user_owns_property(uid,pid) then raise exception 'You cannot review your own property' using errcode='42501';end if;
 if start_day is null or is_now is null or start_day>(now() at time zone 'Asia/Kolkata')::date or (is_now and end_day is not null) or (not is_now and (end_day is null or end_day<start_day or end_day>(now() at time zone 'Asia/Kolkata')::date)) then raise exception 'Check tenancy dates';end if;
 if paid is null or paid not between 0 and 10000000 or pr is null or pr not between 1 and 5 or (lr is not null and lr not between 1 and 5) or words is null or char_length(words) not between 10 and 5000 then raise exception 'Check review fields';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||'|'||pid::text,0));
 if private.user_owns_property(uid,pid) then raise exception 'You cannot review your own property' using errcode='42501';end if;
 select id into tid from private.tenancies where user_id=uid and property_id=pid and start_date=start_day;
 if tid is not null then select id into rid from public.reviews where tenancy_id=tid;return jsonb_build_object('status','exists','id',rid);end if;
 select * into existing from private.tenancies where user_id=uid and property_id=pid and daterange(start_date,end_date+1,'[)')&&daterange(start_day,end_day+1,'[)') limit 1;
 if existing.id is not null then insert into private.tenancy_conflicts(user_id,property_id,existing_tenancy,proposed_start,proposed_end) values(uid,pid,existing.id,start_day,end_day) on conflict do nothing;return jsonb_build_object('status','overlap');end if;
 select * into assoc from public.management_associations where property_id=pid and start_date<=start_day and (end_date is null or end_date>start_day);
 if assoc.id is null and lr is not null then raise exception 'No manager recorded for this tenancy start; leave management rating unanswered';end if;
 insert into private.tenancies(user_id,property_id,start_date,end_date,is_current,rent_paid,association_id,landlord_id) values(uid,pid,start_day,end_day,is_now,paid,assoc.id,assoc.landlord_id) returning id into tid;
 insert into public.reviews(tenancy_id,profile_id,property_id,landlord_id,property_rating,landlord_rating,body) values(tid,(select public_profile_id from private.accounts where user_id=uid),pid,assoc.landlord_id,pr,lr,words) returning id into rid;
 insert into private.review_answers(review_id,self_identifies_woman,recommendation) values(rid,coalesce((p_input->>'woman')::boolean,false),(p_input->>'recommend')::boolean);
 return jsonb_build_object('status','created','id',rid);
end;$$;

commit;
