begin;
create function public.get_admin_record_details(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_administrator();
 select payload into result from private.admin_platform_records where kind=p_kind and id=p_id;
 if result is null then raise exception 'Record unavailable';end if;
 return result||jsonb_build_object('description',(select description from public.properties where p_kind='properties' and id=p_id),'photos',case when p_kind='properties' then (select coalesce(jsonb_agg(jsonb_build_object('id',ph.id,'name',pp.public_alias,'role','Landlord / representative')),'[]'::jsonb) from private.property_photos ph join private.accounts a on a.user_id=ph.owner_id join public.public_profiles pp on pp.id=a.public_profile_id where ph.property_id=p_id and ph.status='visible') else result->'photos' end,'applications',(select coalesce(jsonb_agg(jsonb_build_object('id',app.id,'kind',app.kind,'property',app.property,'status',app.status)),'[]'::jsonb) from private.verification_applications app where (p_kind='properties' and app.property_id=p_id) or (p_kind='users' and app.applicant_id=p_id)),'history',(select coalesce(jsonb_agg(jsonb_build_object('action',e.action,'reason',e.reason,'actor',pp.public_alias,'created_at',e.created_at) order by e.created_at desc),'[]'::jsonb) from private.audit_events e left join private.accounts a on a.user_id=e.actor_id left join public.public_profiles pp on pp.id=a.public_profile_id where e.entity_id=p_id));
end;$$;
create function public.get_admin_media(p_kind text,p_photo uuid) returns text language plpgsql stable security definer set search_path='' as $$begin perform private.require_administrator();if p_kind='property' then return(select object_path from private.property_photos where id=p_photo and status='visible');elsif p_kind='review' then return public.get_admin_review_photo(p_photo);end if;raise exception 'Invalid media type';end;$$;
create function public.get_admin_verification_queue(p_filters jsonb default '{}'::jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;summary jsonb;page_number integer:=coalesce((p_filters->>'page')::integer,1);q text:=left(coalesce(p_filters->>'query',''),120);sort_order text:=coalesce(p_filters->>'sort','newest');
begin
 perform private.require_administrator();
 if page_number not between 1 and 100000 or sort_order not in('newest','oldest','name') then raise exception 'Invalid verification filters';end if;
 summary:=public.get_verification_management()->'summary';
 with filtered as(select app.*, (select coalesce(jsonb_agg(distinct d.evidence_kind),'[]'::jsonb) from private.documents d where d.id=app.document_id or d.id in(select document_id from private.evidence_attachments where primary_document_id=app.document_id)) document_types from private.verification_applications app where
 (q='' or strpos(lower(app.alias||' '||app.property||' '||app.address||' '||app.applicant_id::text),lower(q))>0) and (coalesce(p_filters->>'type','')='' or app.kind=p_filters->>'type') and (coalesce(p_filters->>'demo','')='' or app.is_demo=(p_filters->>'demo'='demo')) and (coalesce(p_filters->>'status','')='' or (case when p_filters->>'status'='pending' then app.backend_status='pending' else app.status=p_filters->>'status' end)) and (coalesce(p_filters->>'from','')='' or app.created_at::date>=(p_filters->>'from')::date) and (coalesce(p_filters->>'to','')='' or app.created_at::date<=(p_filters->>'to')::date) and (coalesce(p_filters->>'reviewer','')='' or (p_filters->>'reviewer'='mine' and app.assigned_to=auth.uid()) or (p_filters->>'reviewer'='unassigned' and app.assigned_to is null)) and (coalesce(p_filters->>'property','')='' or app.property_id::text=p_filters->>'property') and (coalesce(p_filters->>'document','')='' or exists(select 1 from private.documents d where (d.id=app.document_id or d.id in(select document_id from private.evidence_attachments where primary_document_id=app.document_id)) and d.evidence_kind=p_filters->>'document'))),
 paged as(select * from filtered order by case when sort_order='name' then lower(alias) end,case when sort_order='oldest' then created_at end asc,case when sort_order='newest' then created_at end desc,id limit 20 offset(page_number-1)*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(paged)-'email') from paged),'[]'::jsonb),'total',(select count(*) from filtered),'summary',summary,'page',page_number) into result;return result;
end;$$;
-- Approval resolves a linked investigation even when a decision wrapper uses
-- an intermediate pending state. No document content enters the case record.
create function private.close_decided_verification_cases() returns trigger language plpgsql security definer set search_path='' as $$
declare case_id uuid;case_kind text:=case when tg_table_name='claims' then 'landlord' else 'tenant' end;
begin
 if new.status in('approved','rejected','revoked') and old.status is distinct from new.status then
  for case_id in select id from private.platform_cases where kind=case_kind and target_id=new.id and status<>'resolved' loop
   update private.platform_cases set status='resolved',resolution=new.reason,updated_at=now() where id=case_id;
   insert into private.audit_events(actor_id,action,entity_id,reason,after_value) values(auth.uid(),'case_resolved',case_id,coalesce(new.reason,'Evidence decision resolved this verification investigation'),jsonb_build_object('verification_status',new.status));
  end loop;
 end if;return new;
end;$$;
create trigger close_claim_investigation after update of status on private.claims for each row execute function private.close_decided_verification_cases();
create trigger close_tenant_investigation after update of status on private.verification_requests for each row execute function private.close_decided_verification_cases();
create function private.notify_platform_case() returns trigger language plpgsql security definer set search_path='' as $$
declare applicant uuid;
begin
 if new.status is distinct from old.status then
  select applicant_id into applicant from private.verification_applications where kind=new.kind and id=new.target_id;
  insert into private.notifications(user_id,kind,message,href) select recipient,'case','Investigation status: '||replace(new.status,'_',' ')||case when new.status='resolved' then '. '||coalesce(new.resolution,'') else '.' end,'/account/appeals' from(select distinct user_id recipient from (values(new.submitted_by),(applicant))owners(user_id) where user_id is not null)recipients;
 end if;return new;
end;$$;
create trigger case_update_notification after update of status on private.platform_cases for each row execute function private.notify_platform_case();
create or replace function public.get_my_platform_cases() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'target_id',target_id,'status',status,'reason',reason,'resolution',resolution,'created_at',created_at) order by created_at desc),'[]'::jsonb) from private.platform_cases c where submitted_by=auth.uid() or exists(select 1 from private.verification_applications app where app.kind=c.kind and app.id=c.target_id and app.applicant_id=auth.uid())$$;
revoke all on function private.close_decided_verification_cases(),private.notify_platform_case() from public,anon,authenticated,service_role;
revoke all on function public.get_admin_record_details(text,uuid),public.get_admin_media(text,uuid),public.get_admin_verification_queue(jsonb) from public,anon;
grant execute on function public.get_admin_record_details(text,uuid),public.get_admin_media(text,uuid),public.get_admin_verification_queue(jsonb) to authenticated;
commit;
