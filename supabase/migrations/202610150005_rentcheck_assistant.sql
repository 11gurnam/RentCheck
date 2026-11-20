begin;

-- Search and the assistant share the same matching rules, including rent-range overlap.
create function public.match_public_properties(
  p_query text, p_state text, p_city text, p_locality text, p_type text,
  p_min integer, p_max integer, p_rating numeric, p_women text,
  p_preferences text[], p_verification text
) returns table(id uuid,name text,address text,state text,city text,locality text,property_type text,
  rent_min integer,rent_max integer,description text,is_demo boolean,landlord_id uuid,landlord_name text,
  property_rating numeric,review_count bigint)
language sql stable security invoker set search_path='' as $$
  select p.id,p.name,p.address,p.state,p.city,p.locality,p.property_type,p.rent_min,p.rent_max,
    p.description,p.is_demo,p.landlord_id,p.landlord_name,s.property_rating,coalesce(s.review_count,0)
  from public.property_discovery p left join public.property_scores s on s.property_id=p.id
  where (p_rating=0 or s.property_rating>=p_rating)
    and (p_state='' or p.state=p_state) and (p_city='' or p.city=p_city)
    and (p_locality='' or (p_city<>'' and p.locality=p_locality)) and (p_type='' or p.property_type=p_type)
    and p.rent_min<=p_max and p.rent_max>=p_min and p_min>=0 and p_max>=p_min
    and (p_query='' or strpos(lower(concat_ws(' ',p.name,p.address,p.city,p.locality,p.landlord_name)),lower(left(p_query,120)))>0
      or exists(select 1 from public.management_associations a join public.landlords l on l.id=a.landlord_id
        where a.property_id=p.id and strpos(lower(l.name),lower(left(p_query,120)))>0))
    and ((p_preferences='{}' and p_verification='' and p_women='') or
      public.property_matches_information(p.id,p_preferences,p_verification,p_women));
$$;

create or replace function public.search_properties_facets(
  p_query text default '',p_state text default '',p_city text default '',p_locality text default '',
  p_type text default '',p_min integer default 0,p_max integer default 10000000,p_page integer default 1,
  p_rating numeric default 0,p_women text default '',p_preferences text[] default '{}',p_verification text default ''
) returns table(id uuid,name text,address text,state text,city text,locality text,property_type text,
  rent_min integer,rent_max integer,description text,is_demo boolean,landlord_id uuid,landlord_name text,
  total_count bigint,property_rating numeric,review_count bigint,positive_count bigint,eligible_count bigint,recommended boolean)
language sql stable security invoker set search_path='' as $$
  with paged as (
    select m.*, count(*) over() total_count
    from public.match_public_properties(p_query,p_state,p_city,p_locality,p_type,p_min,p_max,p_rating,p_women,p_preferences,p_verification) m
    order by m.city,m.name,m.id limit 12 offset (least(greatest(p_page,1),10000)-1)*12
  )
  select p.id,p.name,p.address,p.state,p.city,p.locality,p.property_type,p.rent_min,p.rent_max,
    p.description,p.is_demo,p.landlord_id,p.landlord_name,p.total_count,p.property_rating,p.review_count,
    w.positive_count,w.eligible_count,w.recommended
  from paged p cross join lateral public.womens_recommendation_counts(p.id) w
  order by p.city,p.name,p.id;
$$;

create function public.get_assistant_properties(
  p_query text,p_state text,p_city text,p_locality text,p_type text,p_min integer,p_max integer,
  p_rating numeric,p_women text,p_preferences text[],p_verification text,p_mode text,
  p_latitude double precision default null,p_longitude double precision default null
) returns jsonb language sql stable security invoker set search_path='' as $$
  with matches as materialized (
    select p.id,p.name,p.city,p.locality,p.rent_min,p.rent_max,p.is_demo,p.property_rating,p.review_count
    from public.match_public_properties(p_query,p_state,p_city,p_locality,p_type,p_min,p_max,p_rating,p_women,p_preferences,p_verification) p
    where p_mode<>'rating' or p.property_rating is not null
  ), ranked as (
    select m.*, info.women_rating,
      case when p_latitude between 6 and 38 and p_longitude between 68 and 98 then
        power(l.latitude::double precision-p_latitude,2) +
        power((l.longitude::double precision-p_longitude)*cos(radians(p_latitude)),2)
      end proximity
    from matches m
    left join public.property_locations l on l.property_id=m.id and p_mode='nearby'
    left join lateral (
      select (property.women->>'rating')::numeric women_rating
      from public.get_public_property_information(array[m.id]) property
      where p_mode='women_rating'
    ) info on true
    where p_mode in ('search','nearby','rating','women_rating')
  ), suggestions as (
    select r.*,row_number() over (
      order by case when p_mode='nearby' then proximity end nulls last,
        case when p_mode='women_rating' then women_rating end desc nulls last,
        case when p_mode in ('rating','women_rating') then property_rating end desc nulls last,
        case when p_mode in ('rating','women_rating') then review_count end desc nulls last, city,name,id
    ) ordinal
    from ranked r
  )
  select jsonb_build_object(
    'count',count(*),
    'examples',count(*) filter(where is_demo),
    'average',round(avg((rent_min::numeric + rent_max::numeric)/2)),
    'rows',coalesce((select jsonb_agg(to_jsonb(s) - array['ordinal','proximity','women_rating'] order by ordinal)
      from suggestions s where ordinal<=3),'[]'::jsonb)
  ) from matches;
$$;

create function public.get_assistant_locations()
returns table(state text,city text,locality text)
language sql stable security invoker set search_path='' as $$
  select distinct p.state,p.city,p.locality from public.property_discovery p;
$$;

revoke all on function public.match_public_properties(text,text,text,text,text,integer,integer,numeric,text,text[],text),
  public.get_assistant_properties(text,text,text,text,text,integer,integer,numeric,text,text[],text,text,double precision,double precision),
  public.get_assistant_locations() from public;
grant execute on function public.match_public_properties(text,text,text,text,text,integer,integer,numeric,text,text[],text),
  public.get_assistant_properties(text,text,text,text,text,integer,integer,numeric,text,text[],text,text,double precision,double precision),
  public.get_assistant_locations() to anon,authenticated;

create table private.assistant_rate_limits (
  bucket text not null,
  minute bigint not null,
  hits integer not null,
  primary key (bucket,minute)
);

create function public.reserve_assistant_request(p_bucket text)
returns boolean language plpgsql security definer set search_path='' as $$
declare current_minute bigint := floor(extract(epoch from clock_timestamp())/60);
declare total integer;
begin
  if p_bucket !~ '^[a-f0-9]{64}$' then return false; end if;
  delete from private.assistant_rate_limits where minute<current_minute-2;
  insert into private.assistant_rate_limits as rate(bucket,minute,hits) values(p_bucket,current_minute,1)
    on conflict(bucket,minute) do update set hits=rate.hits+1 where rate.hits<18
    returning hits into total;
  if total is null then return false; end if;
  insert into private.assistant_rate_limits as rate(bucket,minute,hits) values('all',current_minute,1)
    on conflict(bucket,minute) do update set hits=rate.hits+1 where rate.hits<120
    returning hits into total;
  return total is not null;
end;
$$;
revoke all on function public.reserve_assistant_request(text) from public,anon,authenticated;
grant execute on function public.reserve_assistant_request(text) to service_role;

notify pgrst, 'reload schema';
commit;
