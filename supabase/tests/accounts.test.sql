begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001', 'phase1-a@example.test', '{"public_alias":"TenantOne","role":"admin","is_administrator":true}'),
 ('10000000-0000-0000-0000-000000000002', 'phase1-b@example.test', '{"name":"Synthetic Google Name","email":"phase1-b@example.test"}');

select is((select count(*)::int from private.accounts where user_id::text like '10000000-%'), 2, 'Accounts are created atomically with auth users');
select is((select count(*)::int from private.administrator_grants where user_id::text like '10000000-%'), 0, 'Metadata cannot grant administrator access');
select isnt((select public_profile_id from private.accounts where user_id = '10000000-0000-0000-0000-000000000001'), '10000000-0000-0000-0000-000000000001'::uuid, 'Public profile identifier differs from private auth identity');
select ok((select public_alias like 'Tenant-%' from public.public_profiles where id = (select public_profile_id from private.accounts where user_id = '10000000-0000-0000-0000-000000000002')), 'Google name/email does not become an alias');

set local role anon;
select lives_ok('select * from public.public_profiles', 'Anonymous reads contain alias fields only');
select throws_ok('select email from public.public_profiles', '42703', null, 'Public projection has no email field');
select throws_ok('select * from private.accounts', '42501', null, 'Anonymous cannot read private account mapping');
select throws_ok('select public.set_public_alias(''Hacked'')', '42501', null, 'Anonymous cannot change alias');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*)::int from public.get_my_account()), 1, 'Only own account is returned');
select is((select public_alias from public.get_my_account()), 'TenantOne', 'Own alias is readable');
select is(public.is_administrator(), false, 'Forged metadata provides no admin privileges');
select lives_ok('select public.set_public_alias(''UpdatedTenant'')', 'Own alias can change through the allowed operation');
select is((select public_alias from public.get_my_account()), 'UpdatedTenant', 'Alias update persists');
select throws_ok('select public.set_public_alias(''tenant@example.test'')', '22023', null, 'Email-shaped alias is rejected at the database boundary');
select throws_ok('update public.public_profiles set public_alias = ''Hacked''', '42501', null, 'Direct API role cannot update other public profiles');
select throws_ok('select * from private.accounts', '42501', null, 'Authenticated users cannot read private mappings');
select throws_ok('insert into private.administrator_grants(user_id,reason) values (''10000000-0000-0000-0000-000000000001'',''Self grant'')', '42501', null, 'Authenticated users cannot self-grant privileges');

reset role;
select is((select public_alias like 'Tenant-%' from public.public_profiles where id = (select public_profile_id from private.accounts where user_id = '10000000-0000-0000-0000-000000000002')), true, 'Other account alias stayed unchanged');
insert into private.administrator_grants(user_id, reason) values ('10000000-0000-0000-0000-000000000001', 'Synthetic test grant by database owner');
set local role authenticated;
select is(public.is_administrator(), true, 'Trusted database grant authorizes admin');
reset role;
delete from private.administrator_grants where user_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select is(public.is_administrator(), false, 'Revocation takes effect without trusting a stale role token');
reset role;
select * from finish();
rollback;
