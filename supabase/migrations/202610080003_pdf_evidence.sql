begin;
alter table private.documents add column content_type text not null default 'image/jpeg' check(content_type in('image/jpeg','application/pdf'));
create function public.register_evidence_document(p_user uuid,p_document uuid,p_extension text,p_review uuid default null,p_property uuid default null,p_landlord uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare path text;result uuid;mime text;
begin perform private.catalogue_lock();
if p_extension not in('jpg','pdf') or p_extension is null or num_nonnulls(p_review,p_property,p_landlord)<>1 or not exists(select 1 from private.accounts where user_id=p_user) then raise exception 'Choose one valid evidence target and format';end if;
mime:=case when p_extension='pdf' then 'application/pdf' else 'image/jpeg' end;
path:=case when p_review is not null then 'verification/' else 'claim/' end||p_document::text||'.'||p_extension;
if p_review is not null then
perform r.id from public.reviews r join private.tenancies t on t.id=r.tenancy_id where r.id=p_review and r.status='visible' and t.user_id=p_user for update of r;
if not found then raise exception 'Author access required' using errcode='42501';end if;
if exists(select 1 from private.verification_requests where review_id=p_review and status in('pending','approved')) then raise exception 'This review already has a pending or approved request';end if;
else
if p_property is not null and not exists(select 1 from public.properties where id=p_property and status='published') or p_landlord is not null and not exists(select 1 from public.landlords where id=p_landlord and status='published') then raise exception 'Claim target unavailable';end if;
if exists(select 1 from private.claims where user_id=p_user and status in('pending','approved') and(property_id=p_property or landlord_id=p_landlord)) then raise exception 'You already have an active claim for this profile';end if;
end if;
if not exists(select 1 from storage.objects where bucket_id='rental-documents' and name=path and metadata->>'mimetype'=mime) then raise exception 'Validated evidence not uploaded';end if;
insert into private.documents(id,owner_id,object_path,content_type) values(p_document,p_user,path,mime);
if p_review is not null then insert into private.verification_requests(review_id,document_id) values(p_review,p_document) returning id into result;
else insert into private.claims(user_id,property_id,landlord_id,document_id) values(p_user,p_property,p_landlord,p_document) returning id into result;end if;
return result;end;$$;
revoke all on function public.register_evidence_document(uuid,uuid,text,uuid,uuid,uuid) from public,anon,authenticated;grant execute on function public.register_evidence_document(uuid,uuid,text,uuid,uuid,uuid) to service_role;
commit;
