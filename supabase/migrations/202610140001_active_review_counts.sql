begin;
-- Public scores already use visible reviews. Align property/account dashboard counts
-- without removing deleted reviews from the restricted moderation history.
do $$
declare definition text;
begin
 definition:=pg_get_viewdef('private.admin_platform_records'::regclass,true);
 definition:=replace(definition,'WHERE r.property_id = p.id','WHERE r.property_id = p.id AND r.status = ''visible''');
 definition:=replace(definition,'WHERE r.profile_id = pp.id','WHERE r.profile_id = pp.id AND r.status = ''visible''');
 definition:=replace(definition,'WHERE (r.property_id = p.id)','WHERE (r.property_id = p.id AND r.status = ''visible'')');
 definition:=replace(definition,'WHERE (r.profile_id = pp.id)','WHERE (r.profile_id = pp.id AND r.status = ''visible'')');
 execute 'create or replace view private.admin_platform_records as '||definition;
 definition:=pg_get_functiondef('public.get_admin_platform_overview()'::regprocedure);
 definition:=replace(definition,'from public.reviews)','from public.reviews where status=''visible'')');
 definition:=replace(definition,'from public.reviews where created_at>=month','from public.reviews where status=''visible'' and created_at>=month');
 execute definition;
end;$$;
notify pgrst, 'reload schema';
commit;
