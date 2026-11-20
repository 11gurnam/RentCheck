begin;

create function private.valid_rental_preferences(p_values text[])
returns boolean language sql immutable set search_path='' as $$
  select p_values is not null
    and array_position(p_values,null) is null
    and p_values <@ array['anyone','families','couples','married_couples','unmarried_couples',
      'bachelors','male_bachelors','female_bachelors','women','men','students','working_professionals']
    and cardinality(p_values)=(select count(distinct value) from unnest(p_values) as items(value))
    and (not ('anyone'=any(p_values)) or cardinality(p_values)=1);
$$;

create table private.property_rental_preferences (
  property_id uuid not null references public.properties(id) on delete cascade,
  stated_by uuid not null references auth.users(id) on delete cascade,
  preferences text[] not null check(private.valid_rental_preferences(preferences) and cardinality(preferences)>0),
  updated_at timestamptz not null default now(),
  primary key (property_id,stated_by)
);
alter table private.property_rental_preferences enable row level security;
revoke all on private.property_rental_preferences from public,anon,authenticated,service_role;

create function private.record_rental_preferences(p_property uuid,p_values text[])
returns void language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  previous text[];
  updated text[];
begin
  if not private.valid_rental_preferences(p_values) then
    raise exception 'Choose Anyone alone or select specific rental preferences' using errcode='22023';
  end if;
  select coalesce(array_agg(value order by value),'{}') into updated from unnest(p_values) as items(value);
  select preferences into previous from private.property_rental_preferences where property_id=p_property and stated_by=actor;
  if coalesce(previous,'{}')=updated then return; end if;
  if cardinality(updated)=0 then
    delete from private.property_rental_preferences where property_id=p_property and stated_by=actor;
  else
    insert into private.property_rental_preferences(property_id,stated_by,preferences)
    values(p_property,actor,updated)
    on conflict(property_id,stated_by) do update set preferences=excluded.preferences,updated_at=now();
  end if;
  insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason)
  values(actor,'rental_preferences_updated',p_property,jsonb_build_object('preferences',coalesce(previous,'{}')),
    jsonb_build_object('preferences',updated),'Representative submitted or changed their rental preferences.');
end;
$$;

alter function public.create_property(jsonb,boolean) set schema private;
alter function private.create_property(jsonb,boolean) rename to create_property_before_preferences;
revoke all on function private.create_property_before_preferences(jsonb,boolean) from public,anon,authenticated,service_role;
create function public.create_property(p_input jsonb,p_acknowledged boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  property uuid;
  preferences text[] := '{}';
begin
  if p_input ? 'tenantPreferences' then
    if jsonb_typeof(p_input->'tenantPreferences') is distinct from 'array' then
      raise exception 'Invalid rental preferences' using errcode='22023';
    end if;
    select coalesce(array_agg(value),'{}') into preferences from jsonb_array_elements_text(p_input->'tenantPreferences') as items(value);
    if not private.valid_rental_preferences(preferences) or
       (cardinality(preferences)>0 and (p_input->>'declaredOwner')::boolean is distinct from true) then
      raise exception 'Rental preferences require a declared representative and valid choices' using errcode='22023';
    end if;
  end if;
  property:=private.create_property_before_preferences(p_input,p_acknowledged);
  if cardinality(preferences)>0 then perform private.record_rental_preferences(property,preferences); end if;
  return property;
end;
$$;

create function public.set_property_rental_preferences(p_property uuid,p_values text[])
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.catalogue_lock();
  if not private.account_active(auth.uid()) or not exists(
    select 1 from private.claims c join public.properties p on p.id=c.property_id
    where c.property_id=p_property and c.user_id=auth.uid() and c.status='approved' and p.status='published'
  ) then raise exception 'Approved property representative required' using errcode='42501'; end if;
  perform private.record_rental_preferences(p_property,p_values);
end;
$$;

create view private.published_rental_preferences as
select pref.property_id,pref.preferences
from private.property_rental_preferences pref
join private.accounts a on a.user_id=pref.stated_by and a.status='active'
where exists (
  select 1 from private.claims c where c.property_id=pref.property_id and c.user_id=pref.stated_by and c.status='approved'
);

create function private.property_verified_reviews(p_property uuid)
returns table(review_id uuid,is_current boolean,verified_at timestamptz)
language sql stable security definer set search_path='' as $$
  select r.id,t.is_current,v.decided_at
  from public.reviews r
  join private.tenancies t on t.id=r.tenancy_id and t.property_id=r.property_id and not t.archived
  join private.accounts a on a.user_id=t.user_id and a.status='active'
  join private.verification_requests v on v.review_id=r.id and v.status='approved'
  join private.documents d on d.id=v.document_id and d.owner_id=t.user_id and d.is_demo=r.is_demo
  join public.properties p on p.id=r.property_id and p.is_demo=r.is_demo and p.status='published'
  where r.property_id=p_property and r.status='visible';
$$;

create function public.get_public_property_information(p_properties uuid[])
returns table(property_id uuid,preferences text[],verified_count bigint,current_count bigint,former_count bigint,
  last_verified_at timestamptz,women jsonb,women_recommended boolean)
language sql stable security definer set search_path='' as $$
  select p.id,coalesce(pref.preferences,'{}'),verification.total,verification.current_count,verification.former_count,
    verification.latest,
    case when w.contributors>=5 then jsonb_build_object('count',w.contributors,'rating',w.overall,
      'recommendation',w.recommendation,'categories',w.categories,'recent',w.recent) end,
    coalesce(w.contributors>=5 and w.positive*2>w.contributors and w.recommendation>=3.5,false)
  from public.properties p
  left join private.published_rental_preferences pref on pref.property_id=p.id
  cross join lateral (
    select count(*) total,count(*) filter(where is_current) current_count,
      count(*) filter(where not is_current) former_count,max(verified_at) latest
    from private.property_verified_reviews(p.id)
  ) verification
  cross join lateral private.women_program_summary(p.id) w
  where cardinality(p_properties)<=100 and p.id=any(p_properties) and p.status='published';
$$;

-- The existing search RPC delegates to this shared implementation so its
-- signature, pagination and response shape remain compatible.
create function public.property_matches_information(
  p_property uuid,p_preferences text[],p_verification text,p_women text
) returns boolean language sql stable security definer set search_path='' as $$
  select private.valid_rental_preferences(p_preferences)
    and p_verification in ('','reviews','current','former')
    and p_women in ('','recommended','reviews','safety')
    and exists(select 1 from public.properties p where p.id=p_property and p.status='published')
    and (cardinality(p_preferences)=0 or exists(
      select 1 from private.published_rental_preferences pref where pref.property_id=p_property
        and (pref.preferences @> p_preferences or 'anyone'=any(pref.preferences))
    ))
    and (p_verification='' or exists(
      select 1 from private.property_verified_reviews(p_property) v
      where p_verification='reviews' or (p_verification='current' and v.is_current) or (p_verification='former' and not v.is_current)
    ))
    and (p_women='' or exists (
      select 1 from private.women_program_summary(p_property) w where w.contributors>=5 and (
        p_women='reviews'
        or (p_women='recommended' and w.positive*2>w.contributors and w.recommendation>=3.5)
        or (p_women='safety' and w.categories ?& array['neighbourhood','security'])
      )
    ));
$$;

revoke all on function public.property_matches_information(uuid,text[],text,text) from public;
grant execute on function public.property_matches_information(uuid,text[],text,text) to anon,authenticated;

create or replace function public.search_properties_facets(
  p_query text default '',p_state text default '',p_city text default '',p_locality text default '',
  p_type text default '',p_min integer default 0,p_max integer default 10000000,p_page integer default 1,
  p_rating numeric default 0,p_women text default '',p_preferences text[] default '{}',p_verification text default ''
) returns table(id uuid,name text,address text,state text,city text,locality text,property_type text,
  rent_min integer,rent_max integer,description text,is_demo boolean,landlord_id uuid,landlord_name text,
  total_count bigint,property_rating numeric,review_count bigint,positive_count bigint,eligible_count bigint,recommended boolean)
language sql stable security invoker set search_path='' as $$
  with matches as (
    select p.id,p.name,p.address,p.state,p.city,p.locality,p.property_type,p.rent_min,p.rent_max,
      p.description,p.is_demo,p.landlord_id,p.landlord_name,s.property_rating,coalesce(s.review_count,0) review_count
    from public.property_discovery p left join public.property_scores s on s.property_id=p.id
    where (p_rating=0 or s.property_rating>=p_rating)
      and (p_state='' or p.state=p_state) and (p_city='' or p.city=p_city)
      and (p_locality='' or (p_city<>'' and p.locality=p_locality)) and (p_type='' or p.property_type=p_type)
      and p.rent_min<=p_max and p.rent_max>=p_min and p_min>=0 and p_max>=p_min
      and (p_query='' or strpos(lower(concat_ws(' ',p.name,p.address,p.city,p.locality,p.landlord_name)),lower(left(p_query,120)))>0
        or exists(select 1 from public.management_associations a join public.landlords l on l.id=a.landlord_id
          where a.property_id=p.id and strpos(lower(l.name),lower(left(p_query,120)))>0))
      and ((p_preferences='{}' and p_verification='' and p_women='') or
        public.property_matches_information(p.id,p_preferences,p_verification,p_women))
  ), paged as (
    select m.*,count(*) over() total_count from matches m
    order by m.city,m.name,m.id limit 12 offset (least(greatest(p_page,1),10000)-1)*12
  )
  select p.id,p.name,p.address,p.state,p.city,p.locality,p.property_type,p.rent_min,p.rent_max,
    p.description,p.is_demo,p.landlord_id,p.landlord_name,p.total_count,p.property_rating,p.review_count,
    w.positive_count,w.eligible_count,w.recommended
  from paged p cross join lateral public.womens_recommendation_counts(p.id) w
  order by p.city,p.name,p.id;
$$;

create or replace function public.search_properties_verified(
  p_query text default '',p_state text default '',p_city text default '',p_locality text default '',
  p_type text default '',p_min integer default 0,p_max integer default 10000000,p_page integer default 1,
  p_rating numeric default 0,p_women boolean default false
) returns table(id uuid,name text,address text,state text,city text,locality text,property_type text,
  rent_min integer,rent_max integer,description text,is_demo boolean,landlord_id uuid,landlord_name text,
  total_count bigint,property_rating numeric,review_count bigint,positive_count bigint,eligible_count bigint,recommended boolean)
language sql stable security invoker set search_path='' as $$
  select * from public.search_properties_facets(p_query,p_state,p_city,p_locality,p_type,p_min,p_max,p_page,
    p_rating,case when p_women then 'recommended' else '' end);
$$;

create function public.get_admin_rental_preferences(p_query text default '',p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_administrator();
  return (
    with matching as (
      select p.id,p.name,p.city,pref.preferences,pref.updated_at,pp.public_alias actor,
        p.status='published' and a.status='active' and exists(
          select 1 from private.claims c where c.property_id=p.id and c.user_id=pref.stated_by and c.status='approved'
        ) publicly_visible
      from private.property_rental_preferences pref
      join public.properties p on p.id=pref.property_id
      left join private.accounts a on a.user_id=pref.stated_by
      left join public.public_profiles pp on pp.id=a.public_profile_id
      where strpos(lower(p.name||' '||p.city),lower(coalesce(left(p_query,120),'')))>0 or coalesce(p_query,'')=''
    )
    select jsonb_build_object('total',(select count(*) from matching),'rows',coalesce((
      select jsonb_agg(to_jsonb(m) order by updated_at desc,id)
      from (select * from matching order by updated_at desc,id limit 25 offset (least(greatest(p_page,1),10000)-1)*25) m
    ),'[]'::jsonb))
  );
end;
$$;

create function public.get_admin_women_property_feedback(p_property uuid,p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_administrator();
  return (
    select jsonb_build_object('name',p.name,'demo',p.is_demo,
      'total',(select count(*) from private.eligible_women_feedback(p.id)),
      'ratings',coalesce((
        select jsonb_agg(f.ratings order by f.ratings::text)
        from (select ratings from private.eligible_women_feedback(p.id)
          order by ratings::text limit 25 offset (least(greatest(p_page,1),10000)-1)*25) f
      ),'[]'::jsonb))
    from public.properties p where p.id=p_property
  );
end;
$$;

revoke all on function private.valid_rental_preferences(text[]),private.record_rental_preferences(uuid,text[]),
  private.property_verified_reviews(uuid) from public,anon,authenticated,service_role;
revoke all on private.published_rental_preferences from public,anon,authenticated,service_role;
revoke all on function public.create_property(jsonb,boolean),public.set_property_rental_preferences(uuid,text[]),
  public.get_admin_rental_preferences(text,integer),public.get_admin_women_property_feedback(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.create_property(jsonb,boolean),public.set_property_rental_preferences(uuid,text[]),
  public.get_admin_rental_preferences(text,integer),public.get_admin_women_property_feedback(uuid,integer) to authenticated;
revoke all on function public.get_public_property_information(uuid[]),
  public.search_properties_facets(text,text,text,text,text,integer,integer,integer,numeric,text,text[],text) from public;
grant execute on function public.get_public_property_information(uuid[]),
  public.search_properties_facets(text,text,text,text,text,integer,integer,integer,numeric,text,text[],text) to anon,authenticated;
create or replace function public.set_my_women_feedback(p_review uuid, p_ratings jsonb, p_comment text, p_consent boolean)
returns void language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  rating_key text;
  rating_value jsonb;
  rating_keys constant text[] := array['neighbourhood','security','landlord','privacy','conditions','fair_treatment','overall','recommendation'];
begin
  perform private.catalogue_lock();
  if not private.account_active(actor) then raise exception 'Active account required' using errcode='42501'; end if;
  if p_consent is false then
    delete from private.women_program_feedback where review_id=p_review and user_id=actor;
    return;
  end if;
  if p_consent is distinct from true or not exists (
    select 1 from private.women_program_preferences where user_id=actor and gender='woman' and opted_in
  ) then raise exception 'Program enrollment and explicit review consent are required' using errcode='42501'; end if;
  if not exists (
    select 1 from public.reviews r join private.tenancies t on t.id=r.tenancy_id
    where r.id=p_review and t.user_id=actor and r.status='visible' and not t.archived
  ) then raise exception 'A visible review from your own tenancy is required' using errcode='42501'; end if;
  if jsonb_typeof(p_ratings) is distinct from 'object' or p_ratings - rating_keys <> '{}'::jsonb then
    raise exception 'Use the program rating categories' using errcode='22023';
  end if;
  foreach rating_key in array rating_keys loop
    rating_value := p_ratings->rating_key;
    if rating_key in ('landlord','neighbourhood','security') and (rating_value is null or rating_value='null'::jsonb) then continue; end if;
    if jsonb_typeof(rating_value) is distinct from 'number' or rating_value::text !~ '^[1-5]$' then
      raise exception 'Choose a rating from 1 through 5 for each required field' using errcode='22023';
    end if;
  end loop;
  insert into private.women_program_feedback (review_id,user_id,ratings,comment)
  values (p_review,actor,p_ratings,nullif(btrim(p_comment),''))
  on conflict (review_id) do update
    set ratings=excluded.ratings,comment=excluded.comment,consented_at=now()
    where private.women_program_feedback.user_id=actor;
end;
$$;

create or replace function public.review_is_verified(p_review uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.reviews r
    cross join lateral private.property_verified_reviews(r.property_id) v
    where r.id=p_review and v.review_id=r.id);
$$;

notify pgrst, 'reload schema';
commit;
