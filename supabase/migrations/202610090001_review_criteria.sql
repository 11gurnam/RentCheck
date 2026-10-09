begin;
alter table public.properties drop constraint properties_property_type_check;
alter table public.properties add constraint properties_property_type_check check (property_type in ('Flat','House','PG','Hostel','Homestay'));
alter table public.reviews add column criteria jsonb not null default '[]'::jsonb;
grant select(criteria) on public.reviews to anon, authenticated;

create function private.criteria_average(p_criteria jsonb) returns numeric language sql immutable set search_path='' as $$
 select round(avg((item->>'rating')::numeric),2) from jsonb_array_elements(p_criteria) item;
$$;
revoke all on function private.criteria_average(jsonb) from public,anon,authenticated;

create function private.validate_criteria(p_criteria jsonb, p_type text) returns void language plpgsql set search_path='' as $$
declare item jsonb; required_keys text[] := array['water','electricity','cleanliness','maintenance','security'];
begin
 if jsonb_typeof(p_criteria) is distinct from 'array' then raise exception 'Criteria must be an array'; end if;
 required_keys := required_keys || case p_type
 when 'Flat' then array['ventilation','building'] when 'House' then array['ventilation','space']
 when 'PG' then array['food','wifi','bathrooms'] when 'Hostel' then array['wifi','bathrooms','shared_spaces']
 when 'Homestay' then array['hospitality','food','wifi'] else array[]::text[] end;
 if jsonb_array_length(p_criteria) < cardinality(required_keys) or jsonb_array_length(p_criteria) > cardinality(required_keys)+5 then raise exception 'Rate the required criteria and up to five custom criteria';end if;
 for item in select value from jsonb_array_elements(p_criteria) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'rating') is distinct from 'number' or (item->>'rating')::numeric not between 1 and 5 or (item->>'rating')::numeric <> trunc((item->>'rating')::numeric) or char_length(btrim(coalesce(item->>'label',''))) not between 2 and 60 or char_length(coalesce(item->>'key','')) not between 1 and 80 then raise exception 'Each criterion needs a name and an integer rating from 1 to 5';end if;
  if coalesce(item->>'custom','false') = 'true' then
   if item->>'key' not like 'custom_%' then raise exception 'Invalid custom criterion';end if;
  elsif not (item->>'key' = any(required_keys)) then raise exception 'Criterion does not match accommodation type';end if;
 end loop;
 if exists(select 1 from unnest(required_keys) k where not exists(select 1 from jsonb_array_elements(p_criteria) c where c->>'key'=k and coalesce(c->>'custom','false')='false')) then raise exception 'Rate every required criterion';end if;
 if (select count(distinct c->>'key') from jsonb_array_elements(p_criteria) c) <> jsonb_array_length(p_criteria) or (select count(distinct lower(btrim(c->>'label'))) from jsonb_array_elements(p_criteria) c) <> jsonb_array_length(p_criteria) then raise exception 'Criteria must have distinct names';end if;
end;$$;
revoke all on function private.validate_criteria(jsonb,text) from public,anon,authenticated;

alter function public.create_review(jsonb) set schema private;
alter function private.create_review(jsonb) rename to create_review_base;
alter function public.edit_review(uuid,jsonb) set schema private;
alter function private.edit_review(uuid,jsonb) rename to edit_review_base;
revoke all on function private.create_review_base(jsonb),private.edit_review_base(uuid,jsonb) from public,anon,authenticated;

create function public.create_review(p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; kind text; enriched jsonb:=p_input;
begin
 if p_input ? 'criteria' then
  select property_type into kind from public.properties where id=(p_input->>'property')::uuid;
  perform private.validate_criteria(p_input->'criteria',kind);
  enriched:=jsonb_set(p_input,'{propertyRating}',to_jsonb(round(private.criteria_average(p_input->'criteria'))));
 end if;
 result:=private.create_review_base(enriched);
 if result->>'status'='created' and p_input ? 'criteria' then update public.reviews set criteria=p_input->'criteria' where id=(result->>'id')::uuid;end if;
 return result;
end;$$;
create function public.edit_review(p_review uuid,p_input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare kind text; enriched jsonb:=p_input;
begin
 if p_input ? 'criteria' then
  select p.property_type into kind from public.reviews r join public.properties p on p.id=r.property_id where r.id=p_review;
  perform private.validate_criteria(p_input->'criteria',kind);
  enriched:=jsonb_set(p_input,'{propertyRating}',to_jsonb(round(private.criteria_average(p_input->'criteria'))));
 elsif exists(select 1 from public.reviews where id=p_review and criteria<>'[]'::jsonb) then
  raise exception 'Include criterion ratings when editing this review';
 end if;
 perform private.edit_review_base(p_review,enriched);
 if p_input ? 'criteria' then update public.reviews set criteria=p_input->'criteria' where id=p_review;end if;
end;$$;
revoke all on function public.create_review(jsonb),public.edit_review(uuid,jsonb) from public,anon;
grant execute on function public.create_review(jsonb),public.edit_review(uuid,jsonb) to authenticated;

create or replace view public.property_scores with(security_invoker=true) as
select r.property_id,count(*) review_count,round(avg(coalesce(c.rating,r.property_rating)),2) property_rating
from public.reviews r left join lateral (select avg((i->>'rating')::numeric) rating from jsonb_array_elements(r.criteria) i) c on true
where r.status='visible' group by r.property_id;

create view public.property_criterion_scores with(security_invoker=true) as
select r.property_id,c->>'key' criterion_key,min(c->>'label') label,round(avg((c->>'rating')::numeric),2) rating,count(*) review_count
from public.reviews r cross join lateral jsonb_array_elements(r.criteria) c
where r.status='visible' and coalesce(c->>'custom','false')='false' group by r.property_id,c->>'key';
grant select on public.property_criterion_scores to anon,authenticated;

create or replace function public.get_my_reviews() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'property_id',r.property_id,'property_name',p.name,'property_type',p.property_type,'criteria',r.criteria,'status',r.status,'body',r.body,'propertyRating',coalesce(private.criteria_average(r.criteria),r.property_rating),'managerRating',r.landlord_rating,'start',t.start_date,'end',t.end_date,'current',t.is_current,'paid',t.rent_paid,'woman',a.self_identifies_woman,'recommend',a.recommendation,'was_edited',r.was_edited,'archived',t.archived) order by r.created_at desc),'[]'::jsonb)
from public.reviews r join private.tenancies t on t.id=r.tenancy_id join public.properties p on p.id=r.property_id join private.review_answers a on a.review_id=r.id where t.user_id=auth.uid();
$$;
create or replace function public.get_review_page(p_property uuid default null,p_landlord uuid default null,p_page integer default 1) returns jsonb language sql stable security definer set search_path='' as $$
with eligible as (
 select r.id,r.property_id,r.landlord_id,profile.public_alias as alias,r.body,coalesce(private.criteria_average(r.criteria),r.property_rating) property_rating,r.criteria,r.landlord_rating,t.start_date,t.end_date,t.is_current,t.rent_paid,r.created_at,r.updated_at,r.was_edited
 from public.reviews r join private.tenancies t on t.id=r.tenancy_id join public.public_profiles profile on profile.id=r.profile_id join public.properties p on p.id=r.property_id
 where r.status='visible' and p.status='published' and not t.archived and (p_property is null or r.property_id=p_property) and (p_landlord is null or r.landlord_id=p_landlord)
)
select jsonb_build_object('rows',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) from(select * from eligible order by created_at desc,id limit 20 offset(least(greatest(coalesce(p_page,1),1),10000)-1)*20)x),'total',(select count(*) from eligible));
$$;
notify pgrst,'reload schema';
commit;
