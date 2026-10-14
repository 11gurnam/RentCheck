begin;
create function public.get_admin_audit_search(p_filters jsonb default '{}'::jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;page_number integer:=coalesce((p_filters->>'page')::integer,1);q text:=coalesce(p_filters->>'query','');
begin
 perform private.require_administrator();if page_number not between 1 and 10000 or char_length(q)>120 then raise exception 'Invalid audit filters';end if;
 with eligible as(select e.*,pp.public_alias actor from private.audit_events e left join private.accounts a on a.user_id=e.actor_id left join public.public_profiles pp on pp.id=a.public_profile_id where
 (coalesce(p_filters->>'entity','')='' or e.entity_id::text=p_filters->>'entity') and (coalesce(p_filters->>'action','')='' or e.action=p_filters->>'action') and (q='' or strpos(lower(e.reason||' '||e.action||' '||coalesce(pp.public_alias,'Trusted operator')||' '||e.entity_id::text),lower(q))>0) and (coalesce(p_filters->>'from','')='' or e.created_at::date>=(p_filters->>'from')::date) and (coalesce(p_filters->>'to','')='' or e.created_at::date<=(p_filters->>'to')::date)),paged as(select * from eligible order by created_at desc,id limit 50 offset(page_number-1)*50)
 select jsonb_build_object('entries',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),'total',(select count(*) from eligible),'actions',(select jsonb_agg(action) from(select distinct action from private.audit_events order by action)a)) into result;return result;
end;$$;
create or replace function public.decide_report(p_report uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare report private.reports%rowtype;old_status text;
begin
 perform private.require_administrator();perform private.catalogue_lock();
 if p_decision not in('kept','removed') or p_decision is null or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Choose keep/remove and enter a decision reason';end if;
 select * into report from private.reports where id=p_report and status='pending' for update;
 if report.id is null then raise exception 'Pending report required';end if;
 select status into old_status from public.reviews where id=report.review_id for update;
 if p_decision='removed' and old_status in('visible','hidden') then update public.reviews set status='removed',updated_at=now() where id=report.review_id;end if;
 update private.reports set status=p_decision,decision_reason=btrim(p_reason),decided_at=now() where id=report.id;
 insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'report_decision',report.review_id,jsonb_build_object('review_status',old_status,'report',report.id),jsonb_build_object('decision',p_decision,'review_status',(select status from public.reviews where id=report.review_id)),btrim(p_reason));
end;$$;
create or replace function public.respond_platform_case(p_case uuid,p_message text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.account_active(auth.uid()) then raise exception 'Active account required' using errcode='42501';end if;
 if p_message is null or char_length(btrim(p_message)) not between 10 and 2000 then raise exception 'Explain your response in 10–2000 characters';end if;
 update private.platform_cases c set status='under_review',updated_at=now() where c.id=p_case and (c.submitted_by=auth.uid() or exists(select 1 from private.verification_applications app where app.kind=c.kind and app.id=c.target_id and app.applicant_id=auth.uid())) and c.status='awaiting_information';
 if not found then raise exception 'Case is not awaiting your response' using errcode='42501';end if;
 insert into private.audit_events(actor_id,action,entity_id,reason) values(auth.uid(),'case_applicant_response',p_case,btrim(p_message));
end;$$;
create function private.audit_verification_status() returns trigger language plpgsql security definer set search_path='' as $$begin if new.status is distinct from old.status and new.status='disputed' then insert into private.audit_events(actor_id,action,entity_id,reason,before_value,after_value) values(auth.uid(),'verification_disputed',new.id,coalesce(new.reason,'Property evidence requires dispute investigation'),jsonb_build_object('status',old.status),jsonb_build_object('status',new.status));end if;return new;end;$$;
create trigger landlord_dispute_audit after update of status on private.claims for each row execute function private.audit_verification_status();
create trigger tenant_dispute_audit after update of status on private.verification_requests for each row execute function private.audit_verification_status();
alter function public.get_admin_record_details(text,uuid) set schema private;
alter function private.get_admin_record_details(text,uuid) rename to admin_record_details_base;
create function public.get_admin_record_details(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_administrator();result:=private.admin_record_details_base(p_kind,p_id);
 if p_kind='users' then return result||jsonb_build_object('tenancies',(select coalesce(jsonb_agg(jsonb_build_object('property_id',p.id,'name',p.name,'start',t.start_date,'end',t.end_date,'review_id',r.id)),'[]'::jsonb) from private.tenancies t join public.properties p on p.id=t.property_id left join public.reviews r on r.tenancy_id=t.id where t.user_id=p_id),'cases',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'kind',c.kind,'status',c.status)),'[]'::jsonb) from private.platform_cases c where c.submitted_by=p_id or (c.kind='account' and c.target_id=p_id) or exists(select 1 from private.verification_applications app where app.kind=c.kind and app.id=c.target_id and app.applicant_id=p_id)));end if;
 return result;
end;$$;
revoke all on function private.audit_verification_status(),private.admin_record_details_base(text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_admin_audit_search(jsonb),public.get_admin_record_details(text,uuid) from public,anon;
grant execute on function public.get_admin_audit_search(jsonb),public.get_admin_record_details(text,uuid) to authenticated;
-- Temporary moderation must not remove the author's right to delete a review.
create or replace function private.delete_review_unlocked(p_review uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.reviews r set status='deleted',updated_at=now() where r.id=p_review and r.status in('visible','hidden') and exists(select 1 from private.tenancies t where t.id=r.tenancy_id and t.user_id=auth.uid());
 if not found then raise exception 'Only the author can delete an active review' using errcode='42501';end if;
end;$$;
drop index private.one_active_verification;
create unique index one_active_verification on private.verification_requests(review_id) where status in('pending','approved','disputed');
create function public.get_my_suspension_reason() returns text language sql stable security definer set search_path='' as $$select status_reason from private.accounts where user_id=auth.uid() and status='suspended'$$;
revoke all on function public.get_my_suspension_reason() from public,anon;
grant execute on function public.get_my_suspension_reason() to authenticated;
create function public.admin_remove_landlord_reply(p_reply uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare response public.replies%rowtype;recipient uuid;
begin
 perform private.require_administrator();perform private.catalogue_lock();
 if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'A moderation reason of 10–2000 characters is required';end if;
 select * into response from public.replies where id=p_reply for update;
 if response.id is null then raise exception 'This response is unavailable';end if;
 select user_id into recipient from private.accounts where public_profile_id=response.profile_id;
 delete from public.replies where id=p_reply;
 insert into private.audit_events(actor_id,action,entity_id,reason,before_value,after_value) values(auth.uid(),'landlord_reply_removed',p_reply,btrim(p_reason),to_jsonb(response),jsonb_build_object('removed',true,'review',response.review_id));
 if recipient is not null then insert into private.notifications(user_id,kind,message,href) values(recipient,'moderation','Your property response was removed: '||btrim(p_reason),'/claims');end if;
end;$$;
revoke all on function public.admin_remove_landlord_reply(uuid,text) from public,anon;
grant execute on function public.admin_remove_landlord_reply(uuid,text) to authenticated;
create function private.notify_new_verification_case() returns trigger language plpgsql security definer set search_path='' as $$
declare applicant uuid;
begin
 select applicant_id into applicant from private.verification_applications where kind=new.kind and id=new.target_id;
 if applicant is not null and applicant is distinct from new.submitted_by then
  insert into private.notifications(user_id,kind,message,href) values(applicant,'case','An investigation has been opened for your verification or property claim. Follow its status in reports and appeals.','/account/appeals');
 end if;
 return new;
end;$$;
create trigger new_verification_case_notification after insert on private.platform_cases for each row execute function private.notify_new_verification_case();
revoke all on function private.notify_new_verification_case() from public,anon,authenticated,service_role;
commit;
