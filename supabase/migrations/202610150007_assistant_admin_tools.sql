begin;

-- Only case metadata enters the assistant. Reasons, bodies, contact data and evidence stay in their existing workflows.
create or replace view private.assistant_incidents as
  select c.id, 'dispute'::text kind, c.kind case_kind, c.status, c.status<>'resolved' pending,
    c.created_at, coalesce(p.id, app.property_id, r.property_id) property_id,
    c.submitted_by is not null complaint
  from private.platform_cases c
  left join public.properties p on c.kind='property' and p.id=c.target_id
  left join private.verification_applications app on app.kind=c.kind and app.id=c.target_id
  left join public.reviews r on c.kind='review' and r.id=c.target_id
  union all
  select report.id,'review_report','review',report.status,report.status='pending',report.created_at,r.property_id,true
  from private.reports report join public.reviews r on r.id=report.review_id
  union all
  select report.id,'photo_report','property',report.status,report.status='pending',report.created_at,photo.property_id,true
  from private.photo_reports report join private.property_photos photo on photo.id=report.photo_id
  union all
  select report.id,'message_report','account',report.status,report.status='pending',report.created_at,conversation.property_id,true
  from private.message_reports report join private.messages msg on msg.id=report.message_id
  join private.conversations conversation on conversation.id=msg.conversation_id;

revoke all on private.assistant_incidents from public,anon,authenticated,service_role;

create or replace function public.get_assistant_admin_activity(
  p_kind text, p_property uuid default null, p_landlord uuid default null, p_landlord_kind text default '',
  p_status text default '', p_days integer default 0, p_sort text default 'newest',
  p_application_type text default ''
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform private.require_administrator();
  if p_kind not in ('complaints','disputes','flagged_properties','disputed_properties','complaint_ranking','decisions')
    or p_status not in ('','unresolved','resolved')
    or p_sort not in ('newest','oldest')
    or p_days not between 0 and 3650
    or p_landlord_kind not in ('','manager','claimant')
    or (p_landlord is not null and p_landlord_kind = '')
    or p_application_type not in ('','tenant','landlord') then
    raise exception 'Invalid assistant activity filters';
  end if;

  if p_kind='decisions' then
    select jsonb_build_object(
      'approved',count(distinct e.entity_id) filter (where e.after_value->>'status'='approved'),
      'rejected',count(distinct e.entity_id) filter (where e.after_value->>'status'='rejected')
    ) into result
    from private.audit_events e
    where e.action in ('verification_decision','claim_decision')
      and e.after_value->>'status' in ('approved','rejected')
      and e.created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')
      and e.created_at < ((date_trunc('month', now() at time zone 'Asia/Kolkata') + interval '1 month') at time zone 'Asia/Kolkata')
      and (p_application_type='' or (p_application_type='tenant' and e.action='verification_decision') or (p_application_type='landlord' and e.action='claim_decision'))
      and (p_property is null or exists(select 1 from private.verification_applications app where app.id=e.entity_id and app.property_id=p_property));
    return result;
  end if;

  with matching as materialized (
    select i.*, p.name property, p.city, p.status property_status
    from private.assistant_incidents i left join public.properties p on p.id=i.property_id
    where (case p_kind
      when 'complaints' then i.complaint
      when 'complaint_ranking' then i.complaint and p.status<>'merged'
      when 'flagged_properties' then i.kind='dispute' and i.case_kind='property' and i.pending and p.status<>'merged'
      when 'disputed_properties' then i.kind='dispute' and i.pending and p.status<>'merged'
      else i.kind='dispute' end)
      and (p_status='' or i.pending=(p_status='unresolved'))
      and (p_days=0 or i.created_at<now()-make_interval(days=>p_days))
      and (p_property is null or i.property_id=p_property)
      and (p_landlord is null
        or (p_landlord_kind='manager' and exists(select 1 from public.management_associations a where a.property_id=i.property_id and a.landlord_id=p_landlord))
        or (p_landlord_kind='claimant' and exists(select 1 from private.claims c where c.property_id=i.property_id and c.user_id=p_landlord)))
  ), grouped as (
    select property_id id, 'property'::text kind, property, city, property_status status,
      max(created_at) created_at,count(*) incidents
    from matching
    where p_kind in ('complaint_ranking','flagged_properties','disputed_properties')
    group by property_id,property,city,property_status
  ), records as (
    select id,kind,property,city,status,created_at,incidents, 'property'::text case_kind, id property_id from grouped
    union all
    select id,kind,property,city,status,created_at,null::bigint,case_kind,property_id
    from matching where p_kind in ('complaints','disputes')
  ), visible as (
    select records.*,row_number() over (
      order by case when p_kind='complaint_ranking' then incidents end desc nulls last,
      case when p_sort='oldest' then created_at end,
      case when p_sort='newest' then created_at end desc,id
    ) ordinal
    from records
  )
  select jsonb_build_object('total',(select count(*) from records),
    'rows',coalesce(jsonb_agg(to_jsonb(visible)-'ordinal' order by ordinal),'[]'::jsonb))
  into result from visible where ordinal<=5;
  return result;
end;$$;
revoke all on function public.get_assistant_admin_activity(text,uuid,uuid,text,text,integer,text,text) from public,anon;
grant execute on function public.get_assistant_admin_activity(text,uuid,uuid,text,text,integer,text,text) to authenticated;

-- The existing dashboard list also understands property IDs, unresolved cases and report chronology.
create or replace function public.get_admin_platform_list(p_kind text,p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  result jsonb;
  q text:=left(coalesce(p_filters->>'query',''),120);
  page_number integer:=coalesce((p_filters->>'page')::integer,1);
  sort_order text:=coalesce(p_filters->>'sort','newest');
begin
  perform private.require_administrator();
  if p_kind not in('properties','users','reviews','cases') or page_number not between 1 and 100000
    or sort_order not in('newest','oldest','name','rating','reported') then raise exception 'Invalid management filters';end if;
  with filtered as (
    select rec.* from private.admin_platform_records rec
    where rec.kind=p_kind and (q='' or strpos(lower(rec.search),lower(q))>0)
      and (coalesce(p_filters->>'id','')='' or rec.id::text=p_filters->>'id')
      and (coalesce(p_filters->>'status','')='' or rec.status=p_filters->>'status'
        or (p_kind='cases' and p_filters->>'status'='unresolved' and rec.status<>'resolved'))
      and (coalesce(p_filters->>'property','')='' or
        (p_kind='reviews' and rec.payload->>'property_id'=p_filters->>'property') or
        (p_kind='cases' and exists(select 1 from private.assistant_incidents i where i.kind='dispute' and i.id=rec.id and i.property_id::text=p_filters->>'property')))
      and (coalesce(p_filters->>'older_days','0') in ('','0') or rec.created_at<now()-make_interval(days=>(p_filters->>'older_days')::integer))
      and (coalesce(p_filters->>'city','')='' or rec.payload->>'city'=p_filters->>'city')
      and (coalesce(p_filters->>'role','')='' or rec.payload->'roles' ? (p_filters->>'role'))
      and (coalesce(p_filters->>'verified','')='' or coalesce(rec.payload->>'verified',rec.payload->>'tenant_verified','false')=p_filters->>'verified')
      and (coalesce(p_filters->>'landlord_verified','')='' or rec.payload->>'landlord_verified'=p_filters->>'landlord_verified')
      and (coalesce(p_filters->>'flagged','')<>'true' or (rec.payload->>'pending_reports')::integer>0)
      and (coalesce(p_filters->>'reported','')<>'true' or (rec.payload->>'reports')::integer>0)
      and (coalesce(p_filters->>'rating','')='' or (rec.payload->>'rating')::numeric>=(p_filters->>'rating')::numeric)
      and (coalesce(p_filters->>'from','')='' or rec.created_at::date>=(p_filters->>'from')::date)
      and (coalesce(p_filters->>'to','')='' or rec.created_at::date<=(p_filters->>'to')::date)
  ), paged as (
    select * from filtered order by
      case when sort_order='name' then lower(title) end,
      case when sort_order='rating' then (payload->>'rating')::numeric end desc nulls last,
      case when sort_order='reported' and p_kind='reviews' then (
        select max(r.created_at) from private.reports r where r.review_id=filtered.id
          and (coalesce(p_filters->>'flagged','')<>'true' or r.status='pending')
      ) end desc nulls last,
      case when sort_order='oldest' then created_at end asc,
      case when sort_order='newest' then created_at end desc,id
    limit 20 offset (page_number-1)*20
  )
  select jsonb_build_object('rows',coalesce((select jsonb_agg(payload) from paged),'[]'::jsonb),
    'total',(select count(*) from filtered),'page',page_number,
    'cities',(select jsonb_agg(city) from(select distinct city from public.properties order by city)c)) into result;
  return result;
end;$$;

notify pgrst, 'reload schema';
commit;
