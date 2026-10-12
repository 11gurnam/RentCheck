-- Only explicitly public profile images are displayed; private auth metadata stays private.
alter table public.public_profiles add column avatar_url text
  check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://'));
grant select (avatar_url) on public.public_profiles to anon, authenticated;

