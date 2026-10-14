begin;
alter table private.media_purge_queue drop constraint media_purge_queue_bucket_check;
alter table private.media_purge_queue add constraint media_purge_queue_bucket_check
  check (bucket in ('review-photos','rental-documents','profile-photos'));

-- Queue before the existing account erasure trigger removes the profile mapping.
create function private.queue_account_avatar() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into private.media_purge_queue(user_id,bucket,object_path)
  select old.id,'profile-photos',p.avatar_object
  from private.accounts a join public.public_profiles p on p.id=a.public_profile_id
  where a.user_id=old.id and p.avatar_object is not null
  on conflict(bucket,object_path) do nothing;
  return old;
end;$$;
revoke all on function private.queue_account_avatar() from public,anon,authenticated,service_role;
create trigger a_queue_avatar_before_auth_delete before delete on auth.users
for each row execute function private.queue_account_avatar();
notify pgrst,'reload schema';
commit;
