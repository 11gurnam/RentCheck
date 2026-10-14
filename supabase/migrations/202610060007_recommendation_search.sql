begin;
create function public.search_properties_verified(p_query text default '',p_state text default '',p_city text default '',p_locality text default '',p_type text default '',p_min integer default 0,p_max integer default 10000000,p_page integer default 1,p_rating numeric default 0,p_women boolean default false)
returns table(id uuid,name text,address text,state text,city text,locality text,property_type text,rent_min integer,rent_max integer,description text,is_demo boolean,landlord_id uuid,landlord_name text,total_count bigint,property_rating numeric,review_count bigint,positive_count bigint,eligible_count bigint,recommended boolean)
language sql stable security invoker set search_path='' as $$
 select p.id,p.name,p.address,p.state,p.city,p.locality,p.property_type,p.rent_min,p.rent_max,p.description,p.is_demo,p.landlord_id,p.landlord_name,count(*) over(),s.property_rating,coalesce(s.review_count,0),w.positive_count,w.eligible_count,w.recommended
 from public.property_discovery p left join public.property_scores s on s.property_id=p.id left join lateral public.womens_recommendation_counts(p.id) w on true
 where (not p_women or w.recommended) and (p_rating=0 or s.property_rating>=p_rating) and (p_state='' or p.state=p_state) and (p_city='' or p.city=p_city)
 and (p_locality='' or (p_city<>'' and p.locality=p_locality)) and (p_type='' or p.property_type=p_type)
 and p.rent_min<=p_max and p.rent_max>=p_min and p_min>=0 and p_max>=p_min
 and (p_query='' or concat_ws(' ',p.name,p.address,p.city,p.locality,p.landlord_name) ilike '%'||replace(replace(replace(left(p_query,120),'\','\\'),'%','\%'),'_','\_')||'%'
 or exists(select 1 from public.management_associations a join public.landlords l on l.id=a.landlord_id where a.property_id=p.id and l.name ilike '%'||replace(replace(replace(left(p_query,120),'\','\\'),'%','\%'),'_','\_')||'%'))
 order by p.city,p.name,p.id limit 12 offset (least(greatest(p_page,1),10000)-1)*12
$$;
revoke all on function public.search_properties_verified(text,text,text,text,text,integer,integer,integer,numeric,boolean) from public;
grant execute on function public.search_properties_verified(text,text,text,text,text,integer,integer,integer,numeric,boolean) to anon,authenticated;

commit;
