begin;

create function public.search_near_budget_properties(
  p_query text,p_state text,p_city text,p_locality text,p_type text,p_min integer,p_max integer,
  p_rating numeric,p_women text,p_preferences text[],p_verification text
) returns table(id uuid,name text,address text,state text,city text,locality text,property_type text,
  rent_min integer,rent_max integer,description text,is_demo boolean,landlord_id uuid,landlord_name text,
  total_count bigint,property_rating numeric,review_count bigint,eligible_count bigint,recommended boolean)
language sql stable security invoker set search_path='' as $$
  with suggestions as (
    select m.*, count(*) over() total_count
    from public.match_public_properties(
      p_query,p_state,p_city,p_locality,p_type,p_min,
      least(greatest(p_max,0)::bigint + least(greatest(p_max,0)/10,1000),10000000)::integer,
      p_rating,p_women,p_preferences,p_verification
    ) m
    where p_max between 1 and 9999999 and p_min<=p_max and m.rent_min>p_max
    order by m.rent_min,m.rent_max,m.name,m.id
    limit 3
  )
  select s.id,s.name,s.address,s.state,s.city,s.locality,s.property_type,s.rent_min,s.rent_max,
    s.description,s.is_demo,s.landlord_id,s.landlord_name,s.total_count,s.property_rating,s.review_count,
    w.eligible_count,w.recommended
  from suggestions s cross join lateral public.womens_recommendation_counts(s.id) w
  order by s.rent_min,s.rent_max,s.name,s.id;
$$;

revoke all on function public.search_near_budget_properties(text,text,text,text,text,integer,integer,numeric,text,text[],text) from public;
grant execute on function public.search_near_budget_properties(text,text,text,text,text,integer,integer,numeric,text,text[],text) to anon,authenticated;

notify pgrst, 'reload schema';
commit;
