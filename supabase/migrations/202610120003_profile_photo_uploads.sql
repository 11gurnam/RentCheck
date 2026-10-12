insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-photos','profile-photos',false,5242880,array['image/jpeg']) on conflict(id) do nothing;
alter table public.public_profiles add column avatar_object text;
alter table public.public_profiles drop constraint public_profiles_avatar_url_check;
alter table public.public_profiles add constraint public_profiles_avatar_url_check check (
 avatar_url is null or (char_length(avatar_url)<=2048 and (avatar_url ~ '^https://' or avatar_url ~ '^/api/avatars/[0-9a-f-]{36}\?v=[0-9a-f-]{36}$'))
);
create function public.set_my_profile_photo(p_photo uuid) returns text
language plpgsql security definer set search_path='' as $$
declare profile uuid; previous text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select public_profile_id into profile from private.accounts where user_id=auth.uid();
 if profile is null then raise exception 'Profile unavailable'; end if;
 select avatar_object into previous from public.public_profiles where id=profile for update;
 update public.public_profiles set
 avatar_object=case when p_photo is null then null else profile::text||'/'||p_photo::text||'.jpg' end,
 avatar_url=case when p_photo is null then null else '/api/avatars/'||profile::text||'?v='||p_photo::text end,
 updated_at=now() where id=profile;
 return previous;
end;$$;
revoke all on function public.set_my_profile_photo(uuid) from public,anon;
grant execute on function public.set_my_profile_photo(uuid) to authenticated;
grant select(avatar_object) on public.public_profiles to service_role;
