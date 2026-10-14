begin;
alter table private.tenancies add constraint tenancy_former_end_required check(is_current or end_date is not null);
create table private.review_photos(id uuid primary key,review_id uuid not null references public.reviews(id),object_path text not null unique,status text not null default 'visible' check(status in ('visible','deleted')),created_at timestamptz not null default now());
alter table private.review_photos enable row level security;
revoke all on private.review_photos from public,anon,authenticated;
create function public.register_review_photo(p_user uuid,p_review uuid,p_photo uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.reviews%rowtype;path text:=p_review::text||'/'||p_photo::text||'.jpg';
begin
select reviews.* into r from public.reviews reviews join private.tenancies t on t.id=reviews.tenancy_id where reviews.id=p_review and reviews.status='visible' and t.user_id=p_user for update of reviews;
if r.id is null then raise exception 'Author access required' using errcode='42501';end if;
if (select count(*) from private.review_photos where review_id=p_review and status='visible')>=3 then raise exception 'Maximum three photos';end if;
if not exists(select 1 from storage.objects where bucket_id='review-photos' and name=path) then raise exception 'Photo not uploaded';end if;
insert into private.review_photos(id,review_id,object_path) values(p_photo,p_review,path);
end;$$;
revoke all on function public.register_review_photo(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.register_review_photo(uuid,uuid,uuid) to service_role;
create function public.get_review_photos(p_review uuid) returns table(id uuid) language sql stable security definer set search_path='' as $$
select ph.id from private.review_photos ph join public.reviews r on r.id=ph.review_id join public.properties p on p.id=r.property_id where ph.review_id=p_review and ph.status='visible' and r.status='visible' and p.status='published' order by ph.created_at;
$$;
revoke all on function public.get_review_photos(uuid) from public;grant execute on function public.get_review_photos(uuid) to anon,authenticated;
create function public.get_photo_path(p_photo uuid) returns text language sql stable security definer set search_path='' as $$
select ph.object_path from private.review_photos ph join public.reviews r on r.id=ph.review_id join public.properties p on p.id=r.property_id where ph.id=p_photo and ph.status='visible' and r.status='visible' and p.status='published';
$$;
revoke all on function public.get_photo_path(uuid) from public,anon,authenticated;grant execute on function public.get_photo_path(uuid) to service_role;
create function public.remove_review_photo(p_photo uuid) returns void language plpgsql security definer set search_path='' as $$
begin update private.review_photos ph set status='deleted' where ph.id=p_photo and ph.status='visible' and exists(select 1 from public.reviews r join private.tenancies t on t.id=r.tenancy_id where r.id=ph.review_id and t.user_id=auth.uid());if not found then raise exception 'Author access required' using errcode='42501';end if;end;$$;
revoke all on function public.remove_review_photo(uuid) from public,anon;grant execute on function public.remove_review_photo(uuid) to authenticated;
commit;
