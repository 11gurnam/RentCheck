begin;
set search_path to public,extensions;
select plan(4);
select ok(has_column_privilege('service_role','public.public_profiles','id','SELECT'),'Server avatar lookup can filter by public profile ID');
select ok(has_column_privilege('service_role','public.public_profiles','avatar_object','SELECT'),'Server avatar lookup can read its storage path');
select ok(not has_column_privilege('anon','public.public_profiles','avatar_object','SELECT'),'Anonymous users cannot read avatar storage paths');
select ok(not has_column_privilege('authenticated','public.public_profiles','avatar_object','SELECT'),'Signed-in users cannot read avatar storage paths');
select * from finish();
rollback;
