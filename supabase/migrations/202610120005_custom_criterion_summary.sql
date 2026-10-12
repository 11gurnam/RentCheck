begin;
-- Custom criteria are grouped by normalized tenant labels; built-ins retain stable keys.
create or replace view public.property_criterion_scores with(security_invoker=true) as
select r.property_id,
case when c->>'custom'='true' then 'custom:'||lower(btrim(c->>'label')) else c->>'key' end criterion_key,
min(btrim(c->>'label')) label,round(avg((c->>'rating')::numeric),2) rating,count(*) review_count
from public.reviews r cross join lateral jsonb_array_elements(r.criteria) c
where r.status='visible' group by r.property_id,case when c->>'custom'='true' then 'custom:'||lower(btrim(c->>'label')) else c->>'key' end;
notify pgrst,'reload schema';
commit;
