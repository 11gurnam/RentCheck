begin;

create table private.women_program_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gender text not null check (gender in ('woman','man','non_binary','prefer_not','self_described')),
  description text check (char_length(description) between 1 and 100),
  tenancy text check (tenancy in ('current','former','none')),
  opted_in boolean not null default false,
  check (description is null or gender = 'self_described'),
  check (tenancy is null or gender = 'woman'),
  check (not opted_in or (gender = 'woman' and tenancy is not null and tenancy in ('current','former')))
);

create table private.women_program_feedback (
  review_id uuid primary key references public.reviews(id) on delete cascade,
  user_id uuid not null references private.women_program_preferences(user_id) on delete cascade,
  ratings jsonb not null,
  comment text check (char_length(comment) <= 1500),
  consented_at timestamptz not null default now()
);
create index women_program_feedback_user on private.women_program_feedback(user_id);
alter table private.women_program_preferences enable row level security;
alter table private.women_program_feedback enable row level security;
revoke all on private.women_program_preferences, private.women_program_feedback from public, anon, authenticated;

create function public.get_my_women_program(p_review uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'gender', pref.gender, 'description', pref.description, 'tenancy', pref.tenancy,
    'opted_in', coalesce(pref.opted_in,false), 'feedback',
    (select jsonb_build_object('ratings',f.ratings,'comment',f.comment)
     from private.women_program_feedback f where f.review_id=p_review and f.user_id=auth.uid())
  )
  from (select auth.uid() user_id) me
  left join private.women_program_preferences pref using (user_id)
  where private.account_active(me.user_id);
$$;

create function public.set_my_women_program(p_gender text, p_description text, p_tenancy text, p_opted_in boolean)
returns void language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
begin
  perform private.catalogue_lock();
  if not private.account_active(actor) then raise exception 'Active account required' using errcode='42501'; end if;
  if p_gender is null then
    delete from private.women_program_preferences where user_id=actor;
    return;
  end if;
  insert into private.women_program_preferences (user_id,gender,description,tenancy,opted_in)
  values (actor,p_gender,case when p_gender='self_described' then nullif(btrim(p_description),'') end,
    case when p_gender='woman' then p_tenancy end,coalesce(p_opted_in,false))
  on conflict (user_id) do update
    set gender=excluded.gender,description=excluded.description,tenancy=excluded.tenancy,opted_in=excluded.opted_in;
  if not coalesce(p_opted_in,false) then
    delete from private.women_program_feedback where user_id=actor;
  end if;
end;
$$;

create function public.set_my_women_feedback(p_review uuid, p_ratings jsonb, p_comment text, p_consent boolean)
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
    if rating_key='landlord' and (rating_value is null or rating_value='null'::jsonb) then continue; end if;
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

create function private.erase_deleted_women_feedback() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  delete from private.women_program_feedback where review_id=new.id;
  return new;
end;
$$;
create trigger erase_deleted_women_feedback after update of status on public.reviews
for each row when (new.status='deleted' and old.status is distinct from new.status)
execute function private.erase_deleted_women_feedback();

-- One contribution per person per property. A former tenant's review is aged
-- from the end of the stay if that was earlier than publication.
create function private.eligible_women_feedback(p_property uuid)
returns table(property_id uuid,user_id uuid,review_id uuid,is_demo boolean,ratings jsonb,experience_date date)
language sql stable security definer set search_path='' as $$
  select distinct on (r.property_id, f.user_id)
    r.property_id, f.user_id, r.id, r.is_demo, f.ratings,
    least(r.created_at::date,coalesce(t.end_date,current_date)) as experience_date
  from private.women_program_feedback f
  join private.women_program_preferences pref on pref.user_id=f.user_id and pref.gender='woman' and pref.opted_in
  join private.accounts a on a.user_id=f.user_id and a.status='active'
  join public.reviews r on r.id=f.review_id and r.status='visible'
  join private.tenancies t on t.id=r.tenancy_id and t.user_id=f.user_id and t.property_id=r.property_id and not t.archived
  join public.properties p on p.id=r.property_id and p.status='published' and p.is_demo=r.is_demo
  where (p_property is null or r.property_id=p_property) and exists (
    select 1 from private.verification_requests v join private.documents d on d.id=v.document_id
    where v.review_id=r.id and v.status='approved' and d.owner_id=f.user_id and d.is_demo=r.is_demo
  )
  order by r.property_id,f.user_id,experience_date desc,r.created_at desc,r.id;
$$;

create or replace function private.women_program_summary(p_property uuid)
returns table(contributors bigint,positive bigint,overall numeric,recommendation numeric,categories jsonb,recent jsonb)
language sql stable security definer set search_path='' as $$
  with eligible as materialized (
    select * from private.eligible_women_feedback(p_property)
  ), individual as (
    select e.*,
      (ratings->>'overall')::numeric overall,
      (ratings->>'recommendation')::numeric direct,
      0.6*(ratings->>'recommendation')::numeric + 0.4*(
        select avg(value::text::numeric) from jsonb_each(ratings) where key<>'recommendation' and jsonb_typeof(value)='number'
      ) combined,
      power(0.5::numeric,least(3650,greatest(0,current_date-experience_date))/730.0) weight
    from eligible e
  ), summary as (
    select count(*) n,count(*) filter(where direct>=4) positive,round(avg(overall),1) overall,
      round(3+(sum(combined*weight)/nullif(sum(weight),0)-3) *
        (count(*)/(count(*)+2+coalesce(stddev_pop(combined),0)*2)),1) recommendation
    from individual
  ), by_category as (
    select key,round(avg(value::text::numeric),1) score,
      case when count(*) filter(where experience_date>=current_date-365)>=5
        then round(avg(value::text::numeric) filter(where experience_date>=current_date-365),1) end recent_score
    from individual cross join lateral jsonb_each(ratings)
    where key not in ('overall','recommendation') and jsonb_typeof(value)='number'
    group by key having count(*)>=5
  )
  select n,positive,overall,recommendation,
    coalesce((select jsonb_object_agg(key,score) from by_category),'{}'::jsonb),
    coalesce((select jsonb_object_agg(key,recent_score) from by_category where recent_score is not null),'{}'::jsonb)
  from summary;
$$;

create function public.get_women_property_summary(p_property uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select case when s.contributors>=5 then jsonb_build_object(
    'count',s.contributors,'rating',s.overall,'recommendation',s.recommendation,
    'categories',s.categories,'recent',s.recent
  ) end
  from public.properties p cross join lateral private.women_program_summary(p.id) s
  where p.id=p_property and p.status='published';
$$;

-- Keep the discovery and comparison contract, with the same eligibility and
-- minimum sample as the detailed property score.
create or replace function public.womens_recommendation_counts(p_property uuid default null)
returns table(property_id uuid,positive_count bigint,eligible_count bigint,recommended boolean)
language sql stable security definer set search_path='' as $$
  select p.id,case when s.contributors>=5 then s.positive else 0 end,
    case when s.contributors>=5 then s.contributors else 0 end,
    coalesce(s.contributors>=5 and s.positive*2>s.contributors and s.recommendation>=3.5,false)
  from public.properties p cross join lateral private.women_program_summary(p.id) s
  where p.status='published' and (p_property is null or p.id=p_property);
$$;

create function public.get_admin_women_program() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_administrator();
  return (
    with eligible as materialized (select * from private.eligible_women_feedback(null) where not is_demo),
    enrolled as materialized (
      select pref.user_id from private.women_program_preferences pref
      join private.accounts a on a.user_id=pref.user_id and a.status='active'
      where pref.gender='woman' and pref.opted_in
    )
    select jsonb_build_object(
      'enrolled',(select count(*) from enrolled),
      'verified',(select count(distinct t.user_id) from enrolled e
        join private.tenancies t on t.user_id=e.user_id and not t.archived
        join public.reviews r on r.tenancy_id=t.id and r.status='visible' and not r.is_demo
        join private.verification_requests v on v.review_id=r.id and v.status='approved'
        join private.documents d on d.id=v.document_id and not d.is_demo and d.owner_id=t.user_id),
      'contributions',(select count(*) from eligible),
      'pending',(select count(*) from private.women_program_feedback f
        join enrolled e on e.user_id=f.user_id join public.reviews r on r.id=f.review_id and r.status='visible'
        join private.verification_requests v on v.review_id=f.review_id and v.status='pending'),
      'flagged',(select count(distinct reports.review_id) from private.reports reports
        join private.women_program_feedback f on f.review_id=reports.review_id where reports.status='pending'),
      'reports',(select count(*) from private.reports reports
        join private.women_program_feedback f on f.review_id=reports.review_id where reports.status='pending')
    )
  );
end;
$$;

revoke all on function private.erase_deleted_women_feedback(), private.eligible_women_feedback(uuid), private.women_program_summary(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_my_women_program(uuid), public.set_my_women_program(text,text,text,boolean), public.set_my_women_feedback(uuid,jsonb,text,boolean), public.get_admin_women_program() from public, anon;
grant execute on function public.get_my_women_program(uuid), public.set_my_women_program(text,text,text,boolean), public.set_my_women_feedback(uuid,jsonb,text,boolean), public.get_admin_women_program() to authenticated;
revoke all on function public.get_women_property_summary(uuid) from public;
grant execute on function public.get_women_property_summary(uuid) to anon,authenticated;

commit;
