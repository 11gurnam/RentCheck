begin;
create table private.verification_management(
 kind text not null check(kind in('tenant','landlord')),application_id uuid not null,
 stage text not null default 'pending' check(stage in('pending','under_review','awaiting_information')),
 assigned_to uuid references auth.users(id) on delete set null,updated_at timestamptz not null default now(),
 primary key(kind,application_id)
);
alter table private.verification_management enable row level security;
revoke all on private.verification_management from public,anon,authenticated,service_role;
create function private.remove_verification_management() returns trigger language plpgsql security definer set search_path='' as $$begin delete from private.verification_management where application_id=old.id and kind=case when TG_TABLE_NAME='claims' then 'landlord' else 'tenant' end;return old;end;$$;
create trigger remove_claim_management after delete on private.claims for each row execute function private.remove_verification_management();
create trigger remove_tenant_management after delete on private.verification_requests for each row execute function private.remove_verification_management();
revoke all on function private.remove_verification_management() from public,anon,authenticated,service_role;
create function private.sync_verification_management_status() returns trigger language plpgsql security definer set search_path='' as $$begin if new.status not in('pending','disputed') then update private.verification_management set stage='pending',updated_at=now() where application_id=new.id and kind=case when TG_TABLE_NAME='claims' then 'landlord' else 'tenant' end;end if;return new;end;$$;
create trigger sync_claim_management after update of status on private.claims for each row execute function private.sync_verification_management_status();
create trigger sync_tenant_management after update of status on private.verification_requests for each row execute function private.sync_verification_management_status();
revoke all on function private.sync_verification_management_status() from public,anon,authenticated,service_role;

-- All existing approval routes must enforce the same self-approval rule.
alter function public.decide_verification(uuid,text,text,jsonb) set schema private;
alter function private.decide_verification(uuid,text,text,jsonb) rename to decide_verification_before_management;
revoke all on function private.decide_verification_before_management(uuid,text,text,jsonb) from public,anon,authenticated,service_role;
create function public.decide_verification(p_request uuid,p_decision text,p_reason text,p_checks jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_administrator();
 if p_decision='approved' and exists(select 1 from private.verification_requests v join private.documents d on d.id=v.document_id where v.id=p_request and d.owner_id=auth.uid()) then raise exception 'You cannot approve your own application' using errcode='42501';end if;
 perform private.decide_verification_before_management(p_request,p_decision,p_reason,p_checks);
 update private.verification_management set stage='pending',updated_at=now() where kind='tenant' and application_id=p_request;
end;$$;
alter function public.decide_claim(uuid,text,text,jsonb) set schema private;
alter function private.decide_claim(uuid,text,text,jsonb) rename to decide_claim_before_management;
revoke all on function private.decide_claim_before_management(uuid,text,text,jsonb) from public,anon,authenticated,service_role;
create function public.decide_claim(p_claim uuid,p_decision text,p_reason text,p_checks jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_administrator();
 if p_decision='approved' and exists(select 1 from private.claims where id=p_claim and user_id=auth.uid()) then raise exception 'You cannot approve your own application' using errcode='42501';end if;
 perform private.decide_claim_before_management(p_claim,p_decision,p_reason,p_checks);
 update private.verification_management set stage='pending',updated_at=now() where kind='landlord' and application_id=p_claim;
end;$$;
revoke all on function public.decide_verification(uuid,text,text,jsonb),public.decide_claim(uuid,text,text,jsonb) from public,anon;
grant execute on function public.decide_verification(uuid,text,text,jsonb),public.decide_claim(uuid,text,text,jsonb) to authenticated;

create view private.verification_applications as
select 'tenant'::text kind,v.id,d.owner_id applicant_id,profile.public_alias alias,profile.avatar_url,u.email,
 p.id property_id,p.name property,p.address,t.start_date,t.end_date,v.review_id,v.document_id,d.is_demo,
 v.created_at,v.decided_at,v.decided_by,v.reason,v.status backend_status,
 case when v.status='pending' then coalesce(m.stage,'pending') when v.status='approved' then 'verified' else v.status end status,
 m.assigned_to,reviewer.public_alias assigned_name
from private.verification_requests v join private.documents d on d.id=v.document_id join auth.users u on u.id=d.owner_id
join private.accounts a on a.user_id=d.owner_id join public.public_profiles profile on profile.id=a.public_profile_id
join public.reviews r on r.id=v.review_id join private.tenancies t on t.id=r.tenancy_id join public.properties p on p.id=r.property_id
left join private.verification_management m on m.kind='tenant' and m.application_id=v.id
left join private.accounts ra on ra.user_id=m.assigned_to left join public.public_profiles reviewer on reviewer.id=ra.public_profile_id
union all
select 'landlord',c.id,c.user_id,profile.public_alias,profile.avatar_url,u.email,p.id,p.name,p.address,null::date,null::date,null::uuid,c.document_id,d.is_demo,
 c.created_at,c.decided_at,c.decided_by,c.reason,c.status,
 case when c.status='disputed' and m.stage='awaiting_information' then 'awaiting_information' when c.status='pending' then coalesce(m.stage,'pending') when c.status='approved' then 'verified' else c.status end,
 m.assigned_to,reviewer.public_alias
from private.claims c join private.documents d on d.id=c.document_id join auth.users u on u.id=c.user_id
join private.accounts a on a.user_id=c.user_id join public.public_profiles profile on profile.id=a.public_profile_id join public.properties p on p.id=c.property_id
left join private.verification_management m on m.kind='landlord' and m.application_id=c.id
left join private.accounts ra on ra.user_id=m.assigned_to left join public.public_profiles reviewer on reviewer.id=ra.public_profile_id;
revoke all on private.verification_applications from public,anon,authenticated,service_role;

create function public.get_verification_management(p_query text default '',p_type text default '',p_status text default '',p_sort text default 'newest',p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_administrator();
 if char_length(coalesce(p_query,''))>120 or p_page is null or p_page<1 or p_page>100000 or p_type not in('','tenant','landlord') or p_status not in('','pending','under_review','awaiting_information','verified','rejected','disputed','revoked') or p_sort not in('newest','oldest','name') then raise exception 'Invalid verification filters';end if;
 with filtered as(select * from private.verification_applications where (p_type='' or kind=p_type) and (p_status='' or status=p_status) and (coalesce(p_query,'')='' or strpos(lower(alias||' '||property||' '||address),lower(p_query))>0)),
 paged as(select * from filtered order by case when p_sort='name' then lower(alias) end,case when p_sort='oldest' then created_at end asc,case when p_sort='newest' then created_at end desc,id limit 20 offset (p_page-1)*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(paged)-'email'-'applicant_id') from paged),'[]'::jsonb),'total',(select count(*) from filtered),'page',p_page,'summary',
 (select jsonb_build_object('pending',count(*) filter(where backend_status='pending'),'tenants',count(distinct applicant_id) filter(where kind='tenant' and backend_status='approved' and not is_demo),'landlords',count(distinct applicant_id) filter(where kind='landlord' and backend_status='approved' and not is_demo),'rejected',count(*) filter(where backend_status='rejected'),'disputed',count(*) filter(where backend_status='disputed')) from private.verification_applications)) into result;
 return result;
end;$$;
create function public.get_verification_application(p_kind text,p_application uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare app private.verification_applications%rowtype; result jsonb;
begin
 perform private.require_administrator();
 select * into app from private.verification_applications where kind=p_kind and id=p_application;
 if app.id is null then raise exception 'Application unavailable';end if;
 result:=to_jsonb(app)||jsonb_build_object('documents',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'evidence_kind',d.evidence_kind,'content_type',d.content_type,'expired',d.expires_at<=now()or d.object_path is null or d.deleted_at is not null) order by d.created_at,d.id),'[]'::jsonb) from private.documents d where d.id=app.document_id or d.id in(select document_id from private.evidence_attachments where primary_document_id=app.document_id)),'history',
 (select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'reason',e.reason,'created_at',e.created_at,'actor',profile.public_alias,'before',e.before_value,'after',e.after_value) order by e.created_at desc),'[]'::jsonb) from private.audit_events e left join private.accounts a on a.user_id=e.actor_id left join public.public_profiles profile on profile.id=a.public_profile_id where e.entity_id=app.id),
 'conflicts',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'status',c.status,'alias',profile.public_alias)),'[]'::jsonb) from private.claims c join private.accounts a on a.user_id=c.user_id join public.public_profiles profile on profile.id=a.public_profile_id where c.property_id=app.property_id and c.user_id<>app.applicant_id and c.status in('approved','pending','disputed')));
 return result;
end;$$;
create function public.manage_verification(p_kind text,p_application uuid,p_action text,p_reason text,p_checks jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path='' as $$
declare app private.verification_applications%rowtype;
begin
 perform private.require_administrator();perform private.catalogue_lock();
 select * into app from private.verification_applications where kind=p_kind and id=p_application;
 if app.id is null or p_action is null or p_action not in('assign','request_information','approved','rejected','revoked','disputed') or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Choose a valid action and enter a reason of 10–2000 characters';end if;
 if p_action in('assign','request_information') then
  if app.backend_status not in('pending','disputed') then raise exception 'Only open applications can be reviewed or request information';end if;
  insert into private.verification_management(kind,application_id,stage,assigned_to) values(p_kind,p_application,case when p_action='assign' then 'under_review' else 'awaiting_information' end,auth.uid()) on conflict(kind,application_id) do update set stage=excluded.stage,assigned_to=excluded.assigned_to,updated_at=now();
  if p_action='request_information' then
   if p_kind='tenant' then update private.verification_requests set reason=btrim(p_reason) where id=p_application;else update private.claims set reason=btrim(p_reason) where id=p_application;end if;
   insert into private.notifications(user_id,kind,message,href) values(app.applicant_id,'verification_information','More information required: '||btrim(p_reason),case when p_kind='tenant' then '/reviews/'||app.review_id::text||'/edit' else '/claims' end);
  end if;
 else
  if p_kind='tenant' then perform public.decide_verification(p_application,p_action,p_reason,p_checks);else perform public.decide_claim(p_application,p_action,p_reason,p_checks);end if;
  insert into private.verification_management(kind,application_id,assigned_to) values(p_kind,p_application,auth.uid()) on conflict(kind,application_id) do update set assigned_to=excluded.assigned_to,stage='pending',updated_at=now();
 end if;
 insert into private.audit_events(actor_id,action,entity_id,reason,before_value,after_value) values(auth.uid(),'verification_management_'||p_action,p_application,btrim(p_reason),jsonb_build_object('status',app.status),jsonb_build_object('action',p_action,'checks',p_checks));
end;$$;
create function public.get_my_verification_stage(p_kind text,p_application uuid) returns text language sql stable security definer set search_path='' as $$
select m.stage from private.verification_management m join private.verification_applications app on app.kind=m.kind and app.id=m.application_id where m.kind=p_kind and m.application_id=p_application and app.applicant_id=auth.uid();
$$;
revoke all on function public.get_verification_management(text,text,text,text,integer),public.get_verification_application(text,uuid),public.manage_verification(text,uuid,text,text,jsonb),public.get_my_verification_stage(text,uuid) from public,anon;
grant execute on function public.get_verification_management(text,text,text,text,integer),public.get_verification_application(text,uuid),public.manage_verification(text,uuid,text,text,jsonb),public.get_my_verification_stage(text,uuid) to authenticated;

-- Replace the current evidence set on information requests without changing the application id.
alter function public.register_evidence_bundle(uuid,jsonb,text,uuid,uuid,uuid,boolean,boolean) set schema private;
alter function private.register_evidence_bundle(uuid,jsonb,text,uuid,uuid,uuid,boolean,boolean) rename to register_evidence_bundle_before_management;
revoke all on function private.register_evidence_bundle_before_management(uuid,jsonb,text,uuid,uuid,uuid,boolean,boolean) from public,anon,authenticated,service_role;
create function public.register_evidence_bundle(p_user uuid,p_documents jsonb,p_kind text,p_review uuid default null,p_property uuid default null,p_landlord uuid default null,p_demo boolean default true,p_consent boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare app private.verification_applications%rowtype;item jsonb;primary_id uuid;did uuid;path text;mime text;deadline timestamptz;
begin
 perform private.catalogue_lock();
 select a.* into app from private.verification_applications a join private.verification_management m on m.kind=a.kind and m.application_id=a.id where a.applicant_id=p_user and m.stage='awaiting_information' and a.backend_status in('pending','disputed') and ((p_review is not null and a.kind='tenant' and a.review_id=p_review) or (p_review is null and p_landlord is null and a.kind='landlord' and a.property_id=p_property)) limit 1;
 if app.id is null then return private.register_evidence_bundle_before_management(p_user,p_documents,p_kind,p_review,p_property,p_landlord,p_demo,p_consent);end if;
 perform private.check_record_mode(p_demo,p_consent);
 if p_demo is distinct from app.is_demo or not coalesce(p_consent,false) or num_nonnulls(p_review,p_property,p_landlord)<>1 or jsonb_typeof(p_documents) is distinct from 'array' or jsonb_array_length(p_documents) not between 1 and 3 or p_kind is null or p_kind not in('utility','internet','lease','ownership','authorization','other') then raise exception 'Choose valid supporting documents and confirm consent';end if;
 if not exists(select 1 from public.properties where id=app.property_id and status='published') or (app.kind='tenant' and not exists(select 1 from public.reviews where id=app.review_id and status='visible')) then raise exception 'Application target unavailable';end if;
 primary_id:=(p_documents->0->>'id')::uuid;deadline:=now()+make_interval(days=>(select evidence_retention_days from private.operation_settings where singleton));
 for item in select value from jsonb_array_elements(p_documents) loop
  did:=(item->>'id')::uuid;
  if item->>'extension' is null or item->>'extension' not in('jpg','pdf') then raise exception 'Invalid evidence format';end if;
  path:=case when app.kind='tenant' then 'verification/' else 'claim/' end||did::text||'.'||(item->>'extension');mime:=case when item->>'extension'='pdf' then 'application/pdf' else 'image/jpeg' end;
  if not exists(select 1 from storage.objects where bucket_id='rental-documents' and name=path and metadata->>'mimetype'=mime) then raise exception 'Evidence not uploaded';end if;
  insert into private.documents(id,owner_id,object_path,content_type,is_demo,expires_at,evidence_kind) values(did,p_user,path,mime,p_demo,deadline,p_kind);
  if did<>primary_id then insert into private.evidence_attachments(document_id,primary_document_id) values(did,primary_id);end if;
 end loop;
 if app.kind='tenant' then update private.verification_requests set document_id=primary_id where id=app.id;else update private.claims set document_id=primary_id where id=app.id;end if;
 update private.verification_management set stage='under_review',updated_at=now() where kind=app.kind and application_id=app.id;
 insert into private.audit_events(actor_id,action,entity_id,reason,before_value,after_value) values(p_user,'verification_evidence_updated',app.id,'Applicant supplied updated evidence for requested information',jsonb_build_object('document_id',app.document_id),jsonb_build_object('document_id',primary_id));
 return app.id;
end;$$;
revoke all on function public.register_evidence_bundle(uuid,jsonb,text,uuid,uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.register_evidence_bundle(uuid,jsonb,text,uuid,uuid,uuid,boolean,boolean) to service_role;
notify pgrst,'reload schema';
commit;
