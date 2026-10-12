-- Fetch avatars by identity, because public aliases are not unique.
create function public.get_review_avatars(p_reviews uuid[]) returns jsonb
language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_object_agg(ident, avatar_url), '{}'::jsonb) from (
   select r.id::text ident, profile.avatar_url
   from public.reviews r join public.properties p on p.id=r.property_id
   join public.public_profiles profile on profile.id=r.profile_id
   where r.id=any(p_reviews) and r.status='visible' and p.status='published'
   union all
   select reply.id::text, profile.avatar_url
   from unnest(p_reviews) rid cross join lateral public.get_claimant_replies(rid) allowed
   join public.replies reply on reply.id=allowed.id
   join public.public_profiles profile on profile.id=reply.profile_id
 ) images;
$$;
revoke all on function public.get_review_avatars(uuid[]) from public;
grant execute on function public.get_review_avatars(uuid[]) to anon, authenticated;

