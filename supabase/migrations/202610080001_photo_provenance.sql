begin;
create table private.property_photos(
 id uuid primary key,property_id uuid not null references public.properties(id),owner_id uuid not null references auth.users(id),
 claim_id uuid references private.claims(id),declared_owner boolean not null default false,
 object_path text not null unique,status text not null default 'visible' check(status in('visible','deleted','removed')),created_at timestamptz not null default now(),
 check(claim_id is not null or declared_owner)
);
alter table private.property_photos enable row level security;
revoke all on private.property_photos from public,anon,authenticated;
create function private.photo_landlord_source(p_user uuid,p_property uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case when c.id is not null then jsonb_build_object('allowed',true,'claim',c.id,'verified',c.status='approved','declared',false)
 when exists(select 1 from private.property_contributors where property_id=p_property and user_id=p_user and declared_owner) then jsonb_build_object('allowed',true,'claim',null,'verified',false,'declared',true)
 else jsonb_build_object('allowed',false) end
 from (select 1) x left join lateral(select id,status from private.claims where user_id=p_user and status in('pending','approved') and
 (property_id=p_property or landlord_id in(select landlord_id from public.management_associations where property_id=p_property and active))
 order by (status='approved') desc,created_at,id limit 1)c on true;
$$;
revoke all on function private.photo_landlord_source(uuid,uuid) from public,anon,authenticated,service_role;
create function public.get_my_landlord_photo_access(p_property uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case when auth.uid() is not null and exists(select 1 from public.properties where id=p_property and status='published') then private.photo_landlord_source(auth.uid(),p_property) else jsonb_build_object('allowed',false) end;
$$;
revoke all on function public.get_my_landlord_photo_access(uuid) from public,anon;grant execute on function public.get_my_landlord_photo_access(uuid) to authenticated;
create function public.register_property_photo(p_user uuid,p_property uuid,p_photo uuid) returns void language plpgsql security definer set search_path='' as $$
declare source jsonb;path text:='property/'||p_property::text||'/'||p_photo::text||'.jpg';
begin perform private.catalogue_lock();
if not exists(select 1 from public.properties where id=p_property and status='published') then raise exception 'Property unavailable';end if;
source:=private.photo_landlord_source(p_user,p_property);
if not coalesce((source->>'allowed')::boolean,false) then raise exception 'A declared ownership or active matching claim is required' using errcode='42501';end if;
if (select count(*) from private.property_photos where property_id=p_property and owner_id=p_user and status='visible')>=10 then raise exception 'Maximum ten landlord photos per property';end if;
if not exists(select 1 from storage.objects where bucket_id='review-photos' and name=path) then raise exception 'Photo not uploaded';end if;
insert into private.property_photos(id,property_id,owner_id,claim_id,declared_owner,object_path) values(p_photo,p_property,p_user,(source->>'claim')::uuid,(source->>'declared')::boolean,path);
end;$$;
revoke all on function public.register_property_photo(uuid,uuid,uuid) from public,anon,authenticated;grant execute on function public.register_property_photo(uuid,uuid,uuid) to service_role;
create function private.property_photo_visible(p_photo uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from private.property_photos ph join public.properties p on p.id=ph.property_id left join private.claims c on c.id=ph.claim_id
where ph.id=p_photo and ph.status='visible' and p.status='published' and (ph.declared_owner or c.status in('pending','approved')));
$$;
revoke all on function private.property_photo_visible(uuid) from public,anon,authenticated,service_role;
create function public.get_property_photos(p_property uuid) returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',ph.id,'alias',profile.public_alias,'role','landlord','verified',coalesce(c.status='approved',false) or(ph.declared_owner and coalesce((private.photo_landlord_source(ph.owner_id,ph.property_id)->>'verified')::boolean,false)),'is_demo',p.is_demo,'created_at',ph.created_at) order by ph.created_at,ph.id),'[]'::jsonb)
from private.property_photos ph join public.properties p on p.id=ph.property_id join private.accounts a on a.user_id=ph.owner_id join public.public_profiles profile on profile.id=a.public_profile_id
left join private.claims c on c.id=ph.claim_id where ph.property_id=p_property and private.property_photo_visible(ph.id);
$$;
revoke all on function public.get_property_photos(uuid) from public;grant execute on function public.get_property_photos(uuid) to anon,authenticated;
create function public.get_my_property_photos(p_property uuid) returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status) order by created_at,id),'[]'::jsonb) from private.property_photos where property_id=p_property and owner_id=auth.uid() and status='visible';
$$;
revoke all on function public.get_my_property_photos(uuid) from public,anon;grant execute on function public.get_my_property_photos(uuid) to authenticated;
create function public.remove_property_photo(p_photo uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();update private.property_photos set status='deleted' where id=p_photo and owner_id=auth.uid() and status='visible';if not found then raise exception 'Uploader access required' using errcode='42501';end if;end;$$;
revoke all on function public.remove_property_photo(uuid) from public,anon;grant execute on function public.remove_property_photo(uuid) to authenticated;
drop function public.get_review_photos(uuid);
create function public.get_review_photos(p_review uuid) returns table(id uuid,alias text,role text,verified boolean,is_demo boolean) language sql stable security definer set search_path='' as $$
select ph.id,profile.public_alias,'tenant'::text,public.review_is_verified(r.id),p.is_demo from private.review_photos ph join public.reviews r on r.id=ph.review_id join public.properties p on p.id=r.property_id join public.public_profiles profile on profile.id=r.profile_id
where ph.review_id=p_review and ph.status='visible' and r.status='visible' and p.status='published' order by ph.created_at,ph.id;
$$;
revoke all on function public.get_review_photos(uuid) from public;grant execute on function public.get_review_photos(uuid) to anon,authenticated;
create or replace function public.get_photo_path(p_photo uuid) returns text language sql stable security definer set search_path='' as $$
select ph.object_path from private.review_photos ph join public.reviews r on r.id=ph.review_id join public.properties p on p.id=r.property_id where ph.id=p_photo and ph.status='visible' and r.status='visible' and p.status='published'
union all select object_path from private.property_photos where id=p_photo and private.property_photo_visible(id);
$$;
alter function public.merge_properties(uuid,uuid,uuid[],uuid[],text,text,text) set schema private;
alter function private.merge_properties(uuid,uuid,uuid[],uuid[],text,text,text) rename to merge_properties_before_photos;
revoke all on function private.merge_properties_before_photos(uuid,uuid,uuid[],uuid[],text,text,text) from public,anon,authenticated,service_role;
create function public.merge_properties(p_source uuid,p_target uuid,p_archive uuid[],p_revoke uuid[],p_history text,p_details text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin perform private.merge_properties_before_photos(p_source,p_target,p_archive,p_revoke,p_history,p_details,p_reason);
update private.property_photos set property_id=p_target where property_id=p_source;
end;$$;
revoke all on function public.merge_properties(uuid,uuid,uuid[],uuid[],text,text,text) from public,anon;grant execute on function public.merge_properties(uuid,uuid,uuid[],uuid[],text,text,text) to authenticated;
create function public.preview_review_landlord(p_property uuid,p_start date) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('id',l.id,'name',l.name,'start',a.start_date,'end',a.end_date) from public.management_associations a join public.landlords l on l.id=a.landlord_id join public.properties p on p.id=a.property_id
where p.id=p_property and p.status='published' and a.active and p_start>=a.start_date and(a.end_date is null or p_start<a.end_date);
$$;
revoke all on function public.preview_review_landlord(uuid,date) from public;grant execute on function public.preview_review_landlord(uuid,date) to anon,authenticated;
create table private.photo_reports(id uuid primary key default gen_random_uuid(),photo_id uuid not null references private.property_photos(id),user_id uuid not null references auth.users(id),reason text not null check(char_length(btrim(reason)) between 10 and 2000),status text not null default 'pending' check(status in('pending','kept','removed')),decision_reason text,created_at timestamptz not null default now(),unique(photo_id,user_id));
alter table private.photo_reports enable row level security;revoke all on private.photo_reports from public,anon,authenticated;
create function public.report_property_photo(p_photo uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin if auth.uid() is null or not private.property_photo_visible(p_photo) or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'A visible photo and a report reason are required';end if;
insert into private.photo_reports(photo_id,user_id,reason) values(p_photo,auth.uid(),btrim(p_reason)) on conflict(photo_id,user_id) do nothing;end;$$;
revoke all on function public.report_property_photo(uuid,text) from public,anon;grant execute on function public.report_property_photo(uuid,text) to authenticated;
create function public.get_admin_photo_reports() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();return(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'photo',r.photo_id,'property',p.name,'reason',r.reason,'status',r.status,'decision_reason',r.decision_reason) order by r.created_at,r.id),'[]'::jsonb) from private.photo_reports r join private.property_photos ph on ph.id=r.photo_id join public.properties p on p.id=ph.property_id);end;$$;
revoke all on function public.get_admin_photo_reports() from public,anon;grant execute on function public.get_admin_photo_reports() to authenticated;
create function public.decide_photo_report(p_report uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare r private.photo_reports%rowtype;
begin perform private.require_administrator();perform private.catalogue_lock();
if p_decision not in('kept','removed') or p_decision is null or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Decision and reason required';end if;
select * into r from private.photo_reports where id=p_report and status='pending' for update;if r.id is null then raise exception 'Pending report required';end if;
update private.photo_reports set status=p_decision,decision_reason=btrim(p_reason) where id=r.id;
if p_decision='removed' then update private.property_photos set status='removed' where id=r.photo_id and status='visible';end if;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'photo_report_decision',r.id,to_jsonb(r),jsonb_build_object('status',p_decision,'photo',r.photo_id),btrim(p_reason));end;$$;
revoke all on function public.decide_photo_report(uuid,text,text) from public,anon;grant execute on function public.decide_photo_report(uuid,text,text) to authenticated;
commit;
