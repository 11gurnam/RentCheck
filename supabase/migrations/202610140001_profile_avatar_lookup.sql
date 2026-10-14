-- Filtering the server-only avatar lookup by profile ID requires column access
-- to ID as well as avatar_object. Hosted grants are narrower than local defaults.
grant select(id) on public.public_profiles to service_role;
