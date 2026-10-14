begin;
-- Keep property permissions separate from manager-profile identity.
alter table private.claims drop constraint claims_status_check;
alter table private.claims add constraint claims_status_check check(status in('pending','approved','rejected','revoked','disputed'));
drop index private.claim_account_property_active;
create unique index claim_account_property_active on private.claims(user_id,property_id) where status in('pending','approved','disputed') and property_id is not null;
create function private.flag_conflicting_claim() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.property_id is not null and exists(select 1 from private.claims c where c.property_id=new.property_id and c.user_id<>new.user_id and c.status='approved') then
  new.status:='disputed';new.reason:='Another representative has an approved property claim. Administrator dispute review is required.';
 end if;return new;
end;$$;
create trigger flag_conflicting_claim before insert on private.claims for each row execute function private.flag_conflicting_claim();
create function private.audit_evidence_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' or new.status is distinct from old.status then
 insert into private.audit_events(actor_id,action,entity_id,reason,before_value,after_value) values(coalesce(auth.uid(),new.decided_by,(select owner_id from private.documents where id=new.document_id)),'evidence_status',new.id,coalesce(new.reason,'Evidence submitted for review'),case when TG_OP='UPDATE' then jsonb_build_object('status',old.status) else '{}'::jsonb end,jsonb_build_object('status',new.status));
 end if;return new;
end;$$;
create trigger audit_claim_status after insert or update on private.claims for each row execute function private.audit_evidence_status();
create trigger audit_tenant_status after insert or update on private.verification_requests for each row execute function private.audit_evidence_status();

-- Supplemental evidence inherits the primary document's private access and retention.
create table private.evidence_attachments(document_id uuid primary key references private.documents(id) on delete cascade,primary_document_id uuid not null references private.documents(id) on delete cascade);
alter table private.evidence_attachments enable row level security;
revoke all on private.evidence_attachments from public,anon,authenticated;
alter table private.documents add column evidence_kind text not null default 'other' check(evidence_kind in('utility','internet','lease','ownership','authorization','other'));
create function public.register_evidence_bundle(p_user uuid,p_documents jsonb,p_kind text,p_review uuid default null,p_property uuid default null,p_landlord uuid default null,p_demo boolean default true,p_consent boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare item jsonb;primary_id uuid;rid uuid;did uuid;path text;mime text;
begin
 perform private.catalogue_lock();
 if jsonb_typeof(p_documents) is distinct from 'array' or jsonb_array_length(p_documents) not between 1 and 3 or p_kind is null or p_kind not in('utility','internet','lease','ownership','authorization','other') then raise exception 'Choose one to three valid evidence documents and a document type';end if;
 primary_id:=(p_documents->0->>'id')::uuid;
 rid:=public.register_evidence_document(p_user,primary_id,p_documents->0->>'extension',p_review,p_property,p_landlord,p_demo,p_consent);
 update private.documents set evidence_kind=p_kind where id=primary_id;
 for item in select value from jsonb_array_elements(p_documents) offset 1 loop
  did:=(item->>'id')::uuid;
  if item->>'extension' not in('jpg','pdf') or item->>'extension' is null then raise exception 'Invalid evidence format';end if;
  path:=case when p_review is not null then 'verification/' else 'claim/' end||did::text||'.'||(item->>'extension');
  mime:=case when item->>'extension'='pdf' then 'application/pdf' else 'image/jpeg' end;
  if not exists(select 1 from storage.objects where bucket_id='rental-documents' and name=path and metadata->>'mimetype'=mime) then raise exception 'Evidence not uploaded';end if;
  insert into private.documents(id,owner_id,object_path,content_type,is_demo,expires_at,evidence_kind) select did,p_user,path,mime,p_demo,expires_at,p_kind from private.documents where id=primary_id;
  insert into private.evidence_attachments(document_id,primary_document_id) values(did,primary_id);
 end loop;
 return rid;
end;$$;
revoke all on function public.register_evidence_bundle(uuid,jsonb,text,uuid,uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.register_evidence_bundle(uuid,jsonb,text,uuid,uuid,uuid,boolean,boolean) to service_role;
create function public.get_evidence_documents(p_primary uuid) returns table(id uuid,evidence_kind text,expired boolean) language sql stable security definer set search_path='' as $$
select d.id,d.evidence_kind,(d.expires_at<=now()or d.object_path is null or d.deleted_at is not null) from private.documents d where (d.id=p_primary or d.id in(select document_id from private.evidence_attachments where primary_document_id=p_primary)) and (d.owner_id=auth.uid()or public.is_administrator()) order by d.created_at,d.id;
$$;
revoke all on function public.get_evidence_documents(uuid) from public,anon;grant execute on function public.get_evidence_documents(uuid) to authenticated;
create or replace function private.check_evidence_approval(p_document uuid,p_checks jsonb) returns void language plpgsql security definer set search_path='' as $$
declare d private.documents%rowtype;
begin
 select * into d from private.documents where id=p_document;
 if d.id is null then raise exception 'Evidence unavailable';end if;
 if d.object_path is null or d.expires_at<=now() or d.deleted_at is not null or exists(select 1 from private.evidence_attachments a join private.documents extra on extra.id=a.document_id where a.primary_document_id=p_document and (extra.object_path is null or extra.expires_at<=now() or extra.deleted_at is not null)) then raise exception 'Evidence expired or unavailable. Request fresh evidence';end if;
 if not d.is_demo and (p_checks->>'identity' is distinct from 'true' or p_checks->>'property' is distinct from 'true' or p_checks->>'period_or_authority' is distinct from 'true' or p_checks->>'readable' is distinct from 'true' or p_checks->>'complete' is distinct from 'true' or p_checks->>'valid' is distinct from 'true') then raise exception 'Inspect the evidence and complete all six checks';end if;
end;$$;
create or replace function public.decide_claim(p_claim uuid,p_decision text,p_reason text,p_checks jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path='' as $$
declare c private.claims%rowtype;
begin
 perform private.require_administrator();perform private.catalogue_lock();
 select * into c from private.claims where id=p_claim for update;
 if c.id is null or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Enter a valid claim and decision reason';end if;
 if p_decision='disputed' then
  if c.status not in('pending','approved') then raise exception 'Only active claims can be disputed';end if;
  update private.claims set status='disputed',reason=btrim(p_reason),decided_by=auth.uid(),decided_at=now() where id=c.id;
  return;
 end if;
 if c.status='disputed' then
  if p_decision not in('approved','rejected','revoked') then raise exception 'Choose a dispute resolution';end if;
  update private.claims set status=case when p_decision='revoked' then 'approved' else 'pending' end where id=c.id;
 end if;
 if p_decision='approved' then perform private.check_evidence_approval(c.document_id,p_checks);end if;
 perform private.decide_claim_unlocked(p_claim,p_decision,p_reason);
 if p_decision='approved' then insert into private.audit_events(actor_id,action,entity_id,reason,after_value) values(auth.uid(),'evidence_checklist',p_claim,'Manual ownership or authority checks recorded',p_checks);end if;
end;$$;
-- Manager-profile claims do not authorize any property's tenant responses.
create or replace function public.upsert_claimant_reply(p_claim uuid,p_review uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
declare c private.claims%rowtype;r public.reviews%rowtype;previous text;rid uuid;
begin
 select * into c from private.claims where id=p_claim and user_id=auth.uid() and status='approved' and property_id is not null for update;
 if c.id is null then raise exception 'Approved property claim required' using errcode='42501';end if;
 select * into r from public.reviews where id=p_review and status='visible' and property_id=c.property_id and exists(select 1 from public.properties p where p.id=reviews.property_id and p.status='published');
 if r.id is null then raise exception 'Claim does not match this property review' using errcode='42501';end if;
 if p_body is null or char_length(btrim(p_body)) not between 10 and 3000 then raise exception 'Reply needs 10 to 3000 characters';end if;
 select body into previous from public.replies where claim_id=c.id and review_id=r.id;
 insert into public.replies(claim_id,review_id,profile_id,body) values(c.id,r.id,(select public_profile_id from private.accounts where user_id=auth.uid()),btrim(p_body)) on conflict(claim_id,review_id) do update set body=excluded.body,updated_at=now() returning id into rid;
 insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'claimant_reply',rid,jsonb_build_object('body',previous),jsonb_build_object('body',btrim(p_body)),'Property claimant saved their response');
end;$$;
create or replace function public.get_claimant_replies(p_review uuid) returns table(id uuid,body text,alias text,representative text,created_at timestamptz,updated_at timestamptz) language sql stable security definer set search_path='' as $$
select reply.id,reply.body,profile.public_alias,case when r.is_demo then 'Demonstration Landlord Response' else 'Verified Landlord Response' end,reply.created_at,reply.updated_at from public.replies reply join private.claims c on c.id=reply.claim_id join public.public_profiles profile on profile.id=reply.profile_id join public.reviews r on r.id=reply.review_id join public.properties p on p.id=r.property_id where reply.review_id=p_review and c.status='approved' and c.property_id=r.property_id and r.status='visible' and p.status='published';
$$;
-- A changed tenancy period needs a new evidence decision.
create function private.invalidate_changed_tenancy_verification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.start_date is distinct from old.start_date or new.end_date is distinct from old.end_date then
 update private.verification_requests v set status='revoked',reason='Tenancy dates changed. Submit evidence for the updated period.',decided_at=now() from public.reviews r where r.id=v.review_id and r.tenancy_id=new.id and v.status in('pending','approved');
 end if;return new;
end;$$;
create trigger invalidate_changed_tenancy_verification after update of start_date,end_date on private.tenancies for each row execute function private.invalidate_changed_tenancy_verification();
create function public.get_my_tenancy_status() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('review_id',r.id,'property_id',p.id,'property',p.name,'address',p.address,'start',t.start_date,'end',t.end_date,'is_demo',r.is_demo,'verified',public.review_is_verified(r.id)) order by r.created_at desc),'[]'::jsonb) from public.reviews r join private.tenancies t on t.id=r.tenancy_id join public.properties p on p.id=r.property_id where t.user_id=auth.uid() and r.status='visible';
$$;
revoke all on function public.get_my_tenancy_status() from public,anon;grant execute on function public.get_my_tenancy_status() to authenticated;
revoke all on function private.flag_conflicting_claim(),private.audit_evidence_status(),private.invalidate_changed_tenancy_verification() from public,anon,authenticated,service_role;
create function public.get_verification_context(p_request uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('property_id',p.id,'property',p.name,'address',p.address,'start_date',t.start_date,'end_date',t.end_date) from private.verification_requests v join public.reviews r on r.id=v.review_id join private.tenancies t on t.id=r.tenancy_id join public.properties p on p.id=r.property_id where v.id=p_request and (t.user_id=auth.uid()or public.is_administrator());
$$;
revoke all on function public.get_verification_context(uuid) from public,anon;grant execute on function public.get_verification_context(uuid) to authenticated;

create function public.get_verified_property_representatives(p_property uuid) returns table(alias text,avatar_url text,is_demo boolean) language sql stable security definer set search_path='' as $$
select profile.public_alias,profile.avatar_url,p.is_demo from private.claims c join public.properties p on p.id=c.property_id join private.accounts a on a.user_id=c.user_id join public.public_profiles profile on profile.id=a.public_profile_id where c.property_id=p_property and c.status='approved' and p.status='published';
$$;
revoke all on function public.get_verified_property_representatives(uuid) from public;grant execute on function public.get_verified_property_representatives(uuid) to anon,authenticated;
create or replace function private.photo_landlord_source(p_user uuid,p_property uuid) returns jsonb language sql stable security definer set search_path='' as $$
select case when c.id is not null then jsonb_build_object('allowed',true,'claim',c.id,'verified',c.status='approved','declared',false)
when exists(select 1 from private.property_contributors where property_id=p_property and user_id=p_user and declared_owner) then jsonb_build_object('allowed',true,'claim',null,'verified',false,'declared',true)
else jsonb_build_object('allowed',false) end from(select 1)x left join lateral(select id,status from private.claims where user_id=p_user and property_id=p_property and status in('pending','approved') order by(status='approved')desc,created_at,id limit 1)c on true;
$$;
create or replace function public.get_property_photos(p_property uuid) returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',ph.id,'alias',profile.public_alias,'role','landlord','verified',coalesce((private.photo_landlord_source(ph.owner_id,ph.property_id)->>'verified')::boolean,false),'is_demo',p.is_demo,'created_at',ph.created_at) order by ph.created_at,ph.id),'[]'::jsonb)
from private.property_photos ph join public.properties p on p.id=ph.property_id join private.accounts a on a.user_id=ph.owner_id join public.public_profiles profile on profile.id=a.public_profile_id
left join private.claims c on c.id=ph.claim_id where ph.property_id=p_property and private.property_photo_visible(ph.id);
$$;


create or replace function public.get_property_gallery(p_property uuid) returns jsonb
language sql stable security definer set search_path='' as $$
with photos as (
 select ph.id, profile.public_alias alias, profile.avatar_url, 'tenant'::text role,
 public.review_is_verified(r.id) verified, r.is_demo, ph.created_at
 from private.review_photos ph join public.reviews r on r.id=ph.review_id
 join private.tenancies t on t.id=r.tenancy_id
 join public.properties p on p.id=r.property_id
 join public.public_profiles profile on profile.id=r.profile_id
 where r.property_id=p_property and ph.status='visible' and r.status='visible' and p.status='published' and not t.archived
 union all
 select ph.id, profile.public_alias, profile.avatar_url, 'landlord'::text,
 coalesce((private.photo_landlord_source(ph.owner_id,ph.property_id)->>'verified')::boolean,false),
 p.is_demo, ph.created_at
 from private.property_photos ph join public.properties p on p.id=ph.property_id
 join private.accounts a on a.user_id=ph.owner_id join public.public_profiles profile on profile.id=a.public_profile_id
 left join private.claims c on c.id=ph.claim_id
 where ph.property_id=p_property and private.property_photo_visible(ph.id)
)
select coalesce(jsonb_agg(to_jsonb(photos) order by created_at desc,id),'[]'::jsonb) from photos;
$$;
notify pgrst,'reload schema';
commit;
