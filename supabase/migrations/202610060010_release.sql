begin;
create function public.get_review_page(p_property uuid default null,p_landlord uuid default null,p_page integer default 1) returns jsonb language sql stable security definer set search_path='' as $$
with eligible as (
 select r.id,r.property_id,r.landlord_id,profile.public_alias as alias,r.body,r.property_rating,r.landlord_rating,t.start_date,t.end_date,t.is_current,t.rent_paid,r.created_at,r.updated_at,r.was_edited
 from public.reviews r join private.tenancies t on t.id=r.tenancy_id join public.public_profiles profile on profile.id=r.profile_id join public.properties p on p.id=r.property_id
 where r.status='visible' and p.status='published' and not t.archived and (p_property is null or r.property_id=p_property) and (p_landlord is null or r.landlord_id=p_landlord)
)
select jsonb_build_object('rows',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) from(select * from eligible order by created_at desc,id limit 20 offset(least(greatest(coalesce(p_page,1),1),10000)-1)*20)x),'total',(select count(*) from eligible));
$$;
revoke all on function public.get_review_page(uuid,uuid,integer) from public;grant execute on function public.get_review_page(uuid,uuid,integer) to anon,authenticated;
create function public.get_audit_page(p_page integer default 1,p_entity uuid default null,p_action text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();
return(with eligible as(select id,action,entity_id,before_value,after_value,reason,created_at from private.audit_events where(p_entity is null or entity_id=p_entity) and(coalesce(p_action,'')='' or action=p_action))
select jsonb_build_object('entries',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc,e.id),'[]'::jsonb) from(select * from eligible order by created_at desc,id limit 50 offset(least(greatest(coalesce(p_page,1),1),10000)-1)*50)e),'total',(select count(*) from eligible)));
end;$$;
revoke all on function public.get_audit_page(integer,uuid,text) from public,anon;grant execute on function public.get_audit_page(integer,uuid,text) to authenticated;
create or replace function public.get_merge_preview(p_source uuid,p_target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();
return jsonb_build_object(
'profiles',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from public.properties p where id in(p_source,p_target) and status='published'),
'reviews',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'property',r.property_id,'alias',profile.public_alias,'start',t.start_date,'end',t.end_date,'status',r.status,'body',r.body)),'[]'::jsonb) from private.tenancies t join public.reviews r on r.tenancy_id=t.id join public.public_profiles profile on profile.id=r.profile_id where t.property_id in(p_source,p_target) and not t.archived),
'claims',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'property',c.property_id,'status',c.status,'alias',profile.public_alias)),'[]'::jsonb) from private.claims c join private.accounts a on a.user_id=c.user_id join public.public_profiles profile on profile.id=a.public_profile_id where c.property_id in(p_source,p_target) and c.status in('pending','approved')),
'associations',(select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('manager_name',l.name)),'[]'::jsonb) from public.management_associations a join public.landlords l on l.id=a.landlord_id where property_id in(p_source,p_target) and active));
end;$$;
create or replace function public.update_tenancy(p_review uuid,p_current boolean,p_end date,p_paid integer) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();
if exists(select 1 from private.tenancies t join public.reviews r on r.tenancy_id=t.id where r.id=p_review and t.user_id=auth.uid() and t.archived) then raise exception 'Archived duplicate tenancies cannot be changed';end if;
perform private.update_tenancy_unlocked(p_review,p_current,p_end,p_paid);end;$$;
create function public.can_review_property(p_property uuid) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and exists(select 1 from public.properties where id=p_property and status='published') and not private.user_owns_property(auth.uid(),p_property);
$$;
revoke all on function public.can_review_property(uuid) from public,anon;grant execute on function public.can_review_property(uuid) to authenticated;
commit;
