begin;
create or replace function public.register_review_photo(p_user uuid,p_review uuid,p_photo uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.reviews%rowtype;path text:=p_review::text||'/'||p_photo::text||'.jpg';
begin
select reviews.* into r from public.reviews reviews join private.tenancies t on t.id=reviews.tenancy_id where reviews.id=p_review and reviews.status='visible' and t.user_id=p_user for update of reviews;
if r.id is null then raise exception 'Author access required' using errcode='42501';end if;
if (select count(*) from private.review_photos where review_id=p_review and status='visible')>=5 then raise exception 'Maximum five photos';end if;
if not exists(select 1 from storage.objects where bucket_id='review-photos' and name=path) then raise exception 'Photo not uploaded';end if;
insert into private.review_photos(id,review_id,object_path) values(p_photo,p_review,path);
end;$$;
commit;
