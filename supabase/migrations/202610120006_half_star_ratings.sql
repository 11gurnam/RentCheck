begin;
create or replace function private.validate_criteria(p_criteria jsonb, p_type text) returns void language plpgsql set search_path='' as $$
declare item jsonb; required_keys text[] := array['water','electricity','cleanliness','maintenance','security'];
begin
 if jsonb_typeof(p_criteria) is distinct from 'array' then raise exception 'Criteria must be an array'; end if;
 required_keys := required_keys || case p_type
 when 'Flat' then array['ventilation','building'] when 'House' then array['ventilation','space']
 when 'PG' then array['food','wifi','bathrooms'] when 'Hostel' then array['wifi','bathrooms','shared_spaces']
 when 'Homestay' then array['hospitality','food','wifi'] else array[]::text[] end;
 if jsonb_array_length(p_criteria) < cardinality(required_keys) or jsonb_array_length(p_criteria) > cardinality(required_keys)+5 then raise exception 'Rate the required criteria and up to five custom criteria';end if;
 for item in select value from jsonb_array_elements(p_criteria) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'rating') is distinct from 'number' or (item->>'rating')::numeric not between 0.5 and 5 or (item->>'rating')::numeric * 2 <> trunc((item->>'rating')::numeric * 2) or char_length(btrim(coalesce(item->>'label',''))) not between 2 and 60 or char_length(coalesce(item->>'key','')) not between 1 and 80 then raise exception 'Each criterion needs a name and a rating from 0.5 to 5 in half-star steps';end if;
  if coalesce(item->>'custom','false') = 'true' then
   if item->>'key' not like 'custom_%' then raise exception 'Invalid custom criterion';end if;
  elsif not (item->>'key' = any(required_keys)) then raise exception 'Criterion does not match accommodation type';end if;
 end loop;
 if exists(select 1 from unnest(required_keys) k where not exists(select 1 from jsonb_array_elements(p_criteria) c where c->>'key'=k and coalesce(c->>'custom','false')='false')) then raise exception 'Rate every required criterion';end if;
 if (select count(distinct c->>'key') from jsonb_array_elements(p_criteria) c) <> jsonb_array_length(p_criteria) or (select count(distinct lower(btrim(c->>'label'))) from jsonb_array_elements(p_criteria) c) <> jsonb_array_length(p_criteria) then raise exception 'Criteria must have distinct names';end if;
end;$$;
notify pgrst,'reload schema';
commit;
