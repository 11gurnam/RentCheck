begin;
create function public.get_property_gallery(p_property uuid) returns jsonb
language sql stable security definer set search_path='' as $$
with photos as (
 select ph.id, profile.public_alias alias, profile.avatar_url, 'tenant'::text role,
 public.review_is_verified(r.id) verified, r.is_demo, ph.created_at
 from private.review_photos ph join public.reviews r on r.id=ph.review_id
 join private.tenancies t on t.id=r.tenancy_id
 join public.properties p on p.id=r.property_id
 join public.public_profiles profile on profile.id=r.profile_id
 where r.property_id=p_property and ph.status='visible' and r.status='visible' and p.status='published' and not t.archived
 union all
 select ph.id, profile.public_alias, profile.avatar_url, 'landlord'::text,
 coalesce(c.status='approved',false) or (ph.declared_owner and coalesce((private.photo_landlord_source(ph.owner_id,ph.property_id)->>'verified')::boolean,false)),
 p.is_demo, ph.created_at
 from private.property_photos ph join public.properties p on p.id=ph.property_id
 join private.accounts a on a.user_id=ph.owner_id join public.public_profiles profile on profile.id=a.public_profile_id
 left join private.claims c on c.id=ph.claim_id
 where ph.property_id=p_property and private.property_photo_visible(ph.id)
)
select coalesce(jsonb_agg(to_jsonb(photos) order by created_at desc,id),'[]'::jsonb) from photos;
$$;
revoke all on function public.get_property_gallery(uuid) from public;
grant execute on function public.get_property_gallery(uuid) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
