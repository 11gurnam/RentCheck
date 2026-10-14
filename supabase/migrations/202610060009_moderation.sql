begin;
-- A coarse catalogue mutation lock serializes the prototype's claims, tenancy writes,
-- association maintenance and merges. No client can invoke the unlocked implementations.
create function private.catalogue_lock() returns void language sql volatile set search_path='' as $$select pg_advisory_xact_lock(726364021)$$;
revoke all on function private.catalogue_lock() from public,anon,authenticated;
alter table private.tenancies add column archived boolean not null default false;
alter table private.tenancies drop constraint tenancy_identity;
alter table private.tenancies add column canonical_property_id uuid generated always as(case when not archived then property_id end) stored;
alter table private.tenancies add constraint tenancy_identity unique(user_id,canonical_property_id,start_date) deferrable initially immediate;
create table private.ownership_guards(user_id uuid not null references auth.users(id) on delete cascade,property_id uuid not null references public.properties(id) on delete cascade,origin_id uuid not null,primary key(user_id,property_id,origin_id));
alter table private.ownership_guards enable row level security;revoke all on private.ownership_guards from public,anon,authenticated;
create or replace function private.user_owns_property(p_user uuid,p_property uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from private.property_contributors where property_id=p_property and user_id=p_user and declared_owner) or exists(select 1 from private.ownership_guards where property_id=p_property and user_id=p_user) or exists(select 1 from private.claims c where c.user_id=p_user and c.status='approved' and (c.property_id=p_property or c.landlord_id in(select landlord_id from public.management_associations where property_id=p_property)));
$$;
alter table public.management_associations add column active boolean not null default true;
alter table public.management_associations drop constraint management_associations_property_id_daterange_excl;
alter table public.management_associations add constraint management_no_overlap exclude using gist(property_id with =,daterange(start_date,end_date,'[)') with &&) where(active);
drop policy visible_associations on public.management_associations;
create policy visible_associations on public.management_associations for select to anon,authenticated using(active and exists(select 1 from public.properties p where p.id=property_id and p.status='published') and exists(select 1 from public.landlords l where l.id=landlord_id and l.status='published'));

create table private.reports(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),review_id uuid not null references public.reviews(id),reason text not null check(char_length(btrim(reason)) between 10 and 2000),status text not null default 'pending' check(status in ('pending','kept','removed')),decision_reason text,created_at timestamptz not null default now(),decided_at timestamptz,unique(user_id,review_id));
alter table private.reports enable row level security;revoke all on private.reports from public,anon,authenticated;
create function public.report_review(p_review uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
perform private.catalogue_lock();
if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Report reason needs 10 to 2000 characters';end if;
if not exists(select 1 from public.reviews r join public.properties p on p.id=r.property_id where r.id=p_review and r.status='visible' and p.status='published') then raise exception 'Visible review required';end if;
insert into private.reports(user_id,review_id,reason) values(auth.uid(),p_review,btrim(p_reason)) on conflict(user_id,review_id) do nothing;
end;$$;
create function public.get_admin_reports() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();return(select coalesce(jsonb_agg(jsonb_build_object('id',report.id,'review',r.id,'property',p.name,'body',r.body,'status',report.status,'review_status',r.status,'reason',report.reason,'decision_reason',report.decision_reason) order by report.created_at),'[]'::jsonb) from private.reports report join public.reviews r on r.id=report.review_id join public.properties p on p.id=r.property_id);end;$$;
create function public.decide_report(p_report uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare report private.reports%rowtype;old_status text;
begin perform private.require_administrator();perform private.catalogue_lock();
if p_decision not in ('kept','removed') or p_decision is null or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Choose keep/remove and enter a decision reason';end if;
select * into report from private.reports where id=p_report and status='pending' for update;
if report.id is null then raise exception 'Pending report required';end if;
select status into old_status from public.reviews where id=report.review_id for update;
if p_decision='removed' and old_status='visible' then update public.reviews set status='removed',updated_at=now() where id=report.review_id;end if;
update private.reports set status=p_decision,decision_reason=btrim(p_reason),decided_at=now() where id=report.id;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'report_decision',report.review_id,jsonb_build_object('review_status',old_status,'report',report.id),jsonb_build_object('decision',p_decision,'review_status',(select status from public.reviews where id=report.review_id)),btrim(p_reason));
end;$$;

create function public.get_admin_duplicates() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();return(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'source',d.source_id,'target',d.target_id,'source_name',s.name,'target_name',t.name,'status',d.status,'reason',d.reason) order by s.name),'[]'::jsonb) from private.duplicate_candidates d join public.properties s on s.id=d.source_id join public.properties t on t.id=d.target_id);end;$$;
create function public.mark_duplicate_distinct(p_candidate uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_administrator();perform private.catalogue_lock();
if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Enter a decision reason';end if;
update private.duplicate_candidates set status='distinct',reason=btrim(p_reason) where id=p_candidate and status='pending';if not found then raise exception 'Pending candidate required';end if;
insert into private.audit_events(actor_id,action,entity_id,after_value,reason) values(auth.uid(),'duplicate_distinct',p_candidate,jsonb_build_object('status','distinct'),btrim(p_reason));end;$$;

create function public.get_merge_preview(p_source uuid,p_target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();
return jsonb_build_object(
'profiles',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from public.properties p where id in(p_source,p_target) and status='published'),
'reviews',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'property',r.property_id,'alias',profile.public_alias,'start',t.start_date,'end',t.end_date,'status',r.status,'body',r.body)),'[]'::jsonb) from private.tenancies t join public.reviews r on r.tenancy_id=t.id join public.public_profiles profile on profile.id=r.profile_id where t.property_id in(p_source,p_target) and not t.archived),
'claims',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'property',c.property_id,'status',c.status,'alias',profile.public_alias)),'[]'::jsonb) from private.claims c join private.accounts a on a.user_id=c.user_id join public.public_profiles profile on profile.id=a.public_profile_id where c.property_id in(p_source,p_target) and c.status in('pending','approved')),
'associations',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from public.management_associations a where property_id in(p_source,p_target) and active));
end;$$;

create function public.merge_properties(p_source uuid,p_target uuid,p_archive uuid[],p_revoke uuid[],p_history text,p_details text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare before_data jsonb;loser record;
begin perform private.require_administrator();perform private.catalogue_lock();
if p_source=p_target or p_source is null or p_target is null or p_history not in('source','target') or p_history is null or p_details not in('source','target') or p_details is null or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 or p_archive is null or p_revoke is null then raise exception 'Explicit merge resolutions and a reason are required';end if;
perform 1 from public.properties where id in(p_source,p_target) order by id for update;
if (select count(*) from public.properties where id in(p_source,p_target) and status='published')<>2 then raise exception 'Two published profiles required';end if;
if not exists(select 1 from public.properties s join public.properties t on private.location_key(s.state)=private.location_key(t.state) and private.location_key(s.city)=private.location_key(t.city) where s.id=p_source and t.id=p_target) then raise exception 'Merge only profiles in the same state and city';end if;
before_data:=public.get_merge_preview(p_source,p_target);
if exists(select 1 from unnest(p_archive) as chosen(id) where not exists(select 1 from public.reviews r join private.tenancies t on t.id=r.tenancy_id where r.id=chosen.id and t.property_id in(p_source,p_target) and not t.archived)) or exists(select 1 from unnest(p_revoke) as chosen(id) where not exists(select 1 from private.claims c where c.id=chosen.id and c.property_id in(p_source,p_target) and c.status in('pending','approved'))) then raise exception 'Resolution contains an unrelated or stale record';end if;
-- Refuse every canonical repeat/overlap unless the administrator explicitly archives losers.
if exists(select 1 from private.tenancies a join private.tenancies b on a.user_id=b.user_id and a.id<b.id join public.reviews ra on ra.tenancy_id=a.id join public.reviews rb on rb.tenancy_id=b.id where a.property_id in(p_source,p_target) and b.property_id in(p_source,p_target) and not a.archived and not b.archived and not(ra.id=any(p_archive)) and not(rb.id=any(p_archive)) and daterange(a.start_date,a.end_date+1,'[)')&&daterange(b.start_date,b.end_date+1,'[)')) then raise exception 'Resolve repeated or overlapping tenancies explicitly';end if;
-- Preserve ownership declarations/previous approved ownership when source is archived.
insert into private.ownership_guards(user_id,property_id,origin_id)
select user_id,p_target,p_source from private.property_contributors where property_id=p_source and declared_owner and user_id is not null
union select user_id,p_target,p_source from private.ownership_guards where property_id=p_source
union select c.user_id,p_target,p_source from private.claims c where c.status='approved' and (c.property_id=p_source or c.landlord_id in(select landlord_id from public.management_associations where property_id=p_source))
on conflict do nothing;
-- Kept reviews cannot become self-reviews under the combined representative controls.
if exists(select 1 from private.tenancies t join public.reviews r on r.tenancy_id=t.id where t.property_id in(p_source,p_target) and r.status='visible' and not(r.id=any(p_archive)) and (exists(select 1 from private.ownership_guards g where g.user_id=t.user_id and g.property_id=p_target) or exists(select 1 from private.property_contributors pc where pc.user_id=t.user_id and pc.property_id=p_target and pc.declared_owner) or exists(select 1 from private.claims c where c.user_id=t.user_id and c.status='approved' and not(c.id=any(p_revoke)) and (c.property_id in(p_source,p_target) or c.landlord_id in(select landlord_id from public.management_associations where property_id in(p_source,p_target)))))) then raise exception 'Explicitly resolve reviews that would become self-reviews';end if;
for loser in select * from private.claims where id=any(p_revoke) loop
update private.claims set status='revoked',reason=btrim(p_reason),decided_by=auth.uid(),decided_at=now() where id=loser.id;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'merge_claim_revocation',loser.id,jsonb_build_object('status',loser.status),jsonb_build_object('status','revoked'),btrim(p_reason));
end loop;
if (select count(*) from private.claims where property_id in(p_source,p_target) and status='approved')>1 or exists(select 1 from private.claims where property_id in(p_source,p_target) and status in('pending','approved') group by user_id having count(*)>1) then raise exception 'Explicitly revoke conflicting active claims';end if;
set constraints private.tenancy_identity deferred;
update public.reviews set status=case when status='visible' then 'removed' else status end,updated_at=now() where id=any(p_archive);
update private.tenancies t set archived=true,property_id=p_source where id in(select tenancy_id from public.reviews where id=any(p_archive));
update public.reviews set property_id=p_source where id=any(p_archive);
update private.tenancies set property_id=p_target where property_id=p_source and not archived;
update public.reviews r set property_id=p_target where tenancy_id in(select id from private.tenancies where property_id=p_target and not archived);
update private.claims set property_id=p_target where property_id=p_source;
insert into private.saved_properties(user_id,property_id,created_at) select user_id,p_target,created_at from private.saved_properties where property_id=p_source on conflict(user_id,property_id) do nothing;
delete from private.saved_properties where property_id=p_source;
update public.management_associations set active=false where property_id=case when p_history='source' then p_target else p_source end;
update public.management_associations set property_id=p_target where property_id=p_source and active and p_history='source';
-- Historical snapshot fields on tenancies/reviews are deliberately never rewritten.
update public.properties set status='merged',updated_at=now() where id=p_source;
if p_details='source' then update public.properties t set name=s.name,address=s.address,state=s.state,city=s.city,locality=s.locality,property_type=s.property_type,rent_min=s.rent_min,rent_max=s.rent_max,description=s.description,updated_at=now() from public.properties s where t.id=p_target and s.id=p_source;end if;
insert into private.duplicate_candidates(source_id,target_id,reason)
select case when source_id=p_source then p_target else source_id end,case when target_id=p_source then p_target else target_id end,'Candidate transferred after source profile merge; inspect remaining uncertainty'
from private.duplicate_candidates where status='pending' and (source_id=p_source or target_id=p_source) and source_id<>p_target and target_id<>p_target on conflict(source_id,target_id) do nothing;
update private.duplicate_candidates set status='merged',reason=btrim(p_reason)||' (source archived; other pending candidates transferred)' where source_id=p_source or target_id=p_source;
update private.tenancy_conflicts set status='resolved' where property_id=p_source;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'property_merge',p_target,before_data,jsonb_build_object('source',p_source,'target',p_target,'archived_reviews',to_jsonb(p_archive),'revoked_claims',to_jsonb(p_revoke),'history',p_history,'details',p_details),btrim(p_reason));
set constraints private.tenancy_identity immediate;
end;$$;

create function public.maintain_association(p_property uuid,p_landlord uuid,p_start date,p_end date,p_replace uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare previous jsonb;result uuid;
begin perform private.require_administrator();perform private.catalogue_lock();
if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 or p_start is null or p_end<=p_start then raise exception 'Valid dates and a reason required';end if;
if not exists(select 1 from public.properties where id=p_property and status='published') or not exists(select 1 from public.landlords where id=p_landlord and status='published') then raise exception 'Published profiles required';end if;
if p_replace is not null then select to_jsonb(a) into previous from public.management_associations a where id=p_replace and property_id=p_property and active for update;if previous is null then raise exception 'Existing active association required';end if;end if;
if exists(select 1 from private.claims c join private.tenancies t on t.user_id=c.user_id join public.reviews r on r.tenancy_id=t.id where c.landlord_id=p_landlord and c.status='approved' and t.property_id=p_property and r.status='visible') then raise exception 'Resolve claimed manager tenant reviews before associating this property';end if;
if p_replace is not null then update public.management_associations set active=false where id=p_replace;end if;
insert into public.management_associations(property_id,landlord_id,start_date,end_date) values(p_property,p_landlord,p_start,p_end) returning id into result;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'management_association',p_property,previous,jsonb_build_object('association',result,'manager',p_landlord,'start',p_start,'end',p_end),btrim(p_reason));return result;end;$$;

create function public.create_manager_profile(p_name text,p_description text,p_acknowledged boolean,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin perform private.require_administrator();perform private.catalogue_lock();
if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Enter an audit reason';end if;
if exists(select 1 from public.landlords where status='published' and private.location_key(name)=private.location_key(p_name)) then raise exception 'A manager with this name already exists';end if;
if not coalesce(p_acknowledged,false) and exists(select 1 from public.landlords where status='published' and extensions.similarity(lower(name),lower(p_name))>=0.7) then raise exception 'Review similar manager profiles and acknowledge before creating';end if;
insert into public.landlords(name,description) values(btrim(p_name),coalesce(p_description,'')) returning id into result;
insert into private.audit_events(actor_id,action,entity_id,after_value,reason) values(auth.uid(),'manager_created',result,jsonb_build_object('name',p_name),btrim(p_reason));return result;end;$$;
alter function public.create_review(jsonb) set schema private;
alter function private.create_review(jsonb) rename to create_review_unlocked;
revoke all on function private.create_review_unlocked(jsonb) from public,anon,authenticated,service_role;
create function public.create_review(p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();return private.create_review_unlocked(p_input);end;$$;
revoke all on function public.create_review(jsonb) from public,anon,authenticated;grant execute on function public.create_review(jsonb) to authenticated;
alter function public.edit_review(uuid,jsonb) set schema private;
alter function private.edit_review(uuid,jsonb) rename to edit_review_unlocked;
revoke all on function private.edit_review_unlocked(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.edit_review(p_review uuid,p_input jsonb) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();perform private.edit_review_unlocked(p_review,p_input);end;$$;
revoke all on function public.edit_review(uuid,jsonb) from public,anon,authenticated;grant execute on function public.edit_review(uuid,jsonb) to authenticated;
alter function public.update_tenancy(uuid,boolean,date,integer) set schema private;
alter function private.update_tenancy(uuid,boolean,date,integer) rename to update_tenancy_unlocked;
revoke all on function private.update_tenancy_unlocked(uuid,boolean,date,integer) from public,anon,authenticated,service_role;
create function public.update_tenancy(p_review uuid,p_current boolean,p_end date,p_paid integer) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();if exists(select 1 from private.tenancies t join public.reviews r on r.tenancy_id=t.id where r.id=p_review and t.archived) then raise exception 'Archived duplicate tenancies cannot be changed';end if;perform private.update_tenancy_unlocked(p_review,p_current,p_end,p_paid);end;$$;
revoke all on function public.update_tenancy(uuid,boolean,date,integer) from public,anon,authenticated;grant execute on function public.update_tenancy(uuid,boolean,date,integer) to authenticated;
alter function public.delete_review(uuid) set schema private;
alter function private.delete_review(uuid) rename to delete_review_unlocked;
revoke all on function private.delete_review_unlocked(uuid) from public,anon,authenticated,service_role;
create function public.delete_review(p_review uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();perform private.delete_review_unlocked(p_review);end;$$;
revoke all on function public.delete_review(uuid) from public,anon,authenticated;grant execute on function public.delete_review(uuid) to authenticated;
alter function public.create_property(jsonb,boolean) set schema private;
alter function private.create_property(jsonb,boolean) rename to create_property_unlocked;
revoke all on function private.create_property_unlocked(jsonb,boolean) from public,anon,authenticated,service_role;
create function public.create_property(p_input jsonb,p_acknowledged boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();return private.create_property_unlocked(p_input,p_acknowledged);end;$$;
revoke all on function public.create_property(jsonb,boolean) from public,anon,authenticated;grant execute on function public.create_property(jsonb,boolean) to authenticated;
alter function public.set_saved_property(uuid,boolean) set schema private;
alter function private.set_saved_property(uuid,boolean) rename to set_saved_property_unlocked;
revoke all on function private.set_saved_property_unlocked(uuid,boolean) from public,anon,authenticated,service_role;
create function public.set_saved_property(p_property uuid,p_saved boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();perform private.set_saved_property_unlocked(p_property,p_saved);end;$$;
revoke all on function public.set_saved_property(uuid,boolean) from public,anon,authenticated;grant execute on function public.set_saved_property(uuid,boolean) to authenticated;
alter function public.decide_claim(uuid,text,text) set schema private;
alter function private.decide_claim(uuid,text,text) rename to decide_claim_unlocked;
revoke all on function private.decide_claim_unlocked(uuid,text,text) from public,anon,authenticated,service_role;
create function public.decide_claim(p_claim uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();perform private.decide_claim_unlocked(p_claim,p_decision,p_reason);end;$$;
revoke all on function public.decide_claim(uuid,text,text) from public,anon,authenticated;grant execute on function public.decide_claim(uuid,text,text) to authenticated;
alter function public.update_claimed_details(uuid,jsonb) set schema private;
alter function private.update_claimed_details(uuid,jsonb) rename to update_claimed_details_unlocked;
revoke all on function private.update_claimed_details_unlocked(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.update_claimed_details(p_claim uuid,p_input jsonb) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();perform private.update_claimed_details_unlocked(p_claim,p_input);end;$$;
revoke all on function public.update_claimed_details(uuid,jsonb) from public,anon,authenticated;grant execute on function public.update_claimed_details(uuid,jsonb) to authenticated;
alter function public.upsert_claimant_reply(uuid,uuid,text) set schema private;
alter function private.upsert_claimant_reply(uuid,uuid,text) rename to upsert_claimant_reply_unlocked;
revoke all on function private.upsert_claimant_reply_unlocked(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.upsert_claimant_reply(p_claim uuid,p_review uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();perform private.upsert_claimant_reply_unlocked(p_claim,p_review,p_body);end;$$;
revoke all on function public.upsert_claimant_reply(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.upsert_claimant_reply(uuid,uuid,text) to authenticated;
alter function public.register_claim_document(uuid,uuid,uuid,uuid) set schema private;
alter function private.register_claim_document(uuid,uuid,uuid,uuid) rename to register_claim_document_unlocked;
revoke all on function private.register_claim_document_unlocked(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function public.register_claim_document(p_user uuid,p_property uuid,p_landlord uuid,p_document uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin perform private.catalogue_lock();return private.register_claim_document_unlocked(p_user,p_property,p_landlord,p_document);end;$$;
revoke all on function public.register_claim_document(uuid,uuid,uuid,uuid) from public,anon,authenticated;grant execute on function public.register_claim_document(uuid,uuid,uuid,uuid) to service_role;
revoke all on function public.report_review(uuid,text) from public,anon;grant execute on function public.report_review(uuid,text) to authenticated;
revoke all on function public.get_admin_reports() from public,anon;grant execute on function public.get_admin_reports() to authenticated;
revoke all on function public.decide_report(uuid,text,text) from public,anon;grant execute on function public.decide_report(uuid,text,text) to authenticated;
revoke all on function public.get_admin_duplicates() from public,anon;grant execute on function public.get_admin_duplicates() to authenticated;
revoke all on function public.mark_duplicate_distinct(uuid,text) from public,anon;grant execute on function public.mark_duplicate_distinct(uuid,text) to authenticated;
revoke all on function public.get_merge_preview(uuid,uuid) from public,anon;grant execute on function public.get_merge_preview(uuid,uuid) to authenticated;
revoke all on function public.merge_properties(uuid,uuid,uuid[],uuid[],text,text,text) from public,anon;grant execute on function public.merge_properties(uuid,uuid,uuid[],uuid[],text,text,text) to authenticated;
revoke all on function public.maintain_association(uuid,uuid,date,date,uuid,text) from public,anon;grant execute on function public.maintain_association(uuid,uuid,date,date,uuid,text) to authenticated;
revoke all on function public.create_manager_profile(text,text,boolean,text) from public,anon;grant execute on function public.create_manager_profile(text,text,boolean,text) to authenticated;
create or replace function private.create_review_unlocked(p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();pid uuid:=(p_input->>'property')::uuid;start_day date:=(p_input->>'start')::date;end_day date:=nullif(p_input->>'end','')::date;is_now boolean:=(p_input->>'current')::boolean;paid integer:=(p_input->>'paid')::integer;pr smallint:=(p_input->>'propertyRating')::smallint;lr smallint:=nullif(p_input->>'managerRating','')::smallint;words text:=btrim(p_input->>'body');tid uuid;rid uuid;existing private.tenancies%rowtype;assoc public.management_associations%rowtype;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_input->>'synthetic' is distinct from 'true' then raise exception 'Only fictional tenancy examples allowed';end if;
 if not exists(select 1 from public.properties where id=pid and status='published') then raise exception 'Property unavailable';end if;
 if private.user_owns_property(uid,pid) then raise exception 'You cannot review your own property' using errcode='42501';end if;
 if start_day is null or is_now is null or start_day>(now() at time zone 'Asia/Kolkata')::date or (is_now and end_day is not null) or (not is_now and (end_day is null or end_day<start_day or end_day>(now() at time zone 'Asia/Kolkata')::date)) then raise exception 'Check tenancy dates';end if;
 if paid is null or paid not between 0 and 10000000 or pr is null or pr not between 1 and 5 or (lr is not null and lr not between 1 and 5) or words is null or char_length(words) not between 10 and 5000 then raise exception 'Check review fields';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||'|'||pid::text,0));
 if private.user_owns_property(uid,pid) then raise exception 'You cannot review your own property' using errcode='42501';end if;
 select id into tid from private.tenancies where user_id=uid and property_id=pid and start_date=start_day;
 if tid is not null then select id into rid from public.reviews where tenancy_id=tid;return jsonb_build_object('status','exists','id',rid);end if;
 select * into existing from private.tenancies where user_id=uid and property_id=pid and daterange(start_date,end_date+1,'[)')&&daterange(start_day,end_day+1,'[)') limit 1;
 if existing.id is not null then insert into private.tenancy_conflicts(user_id,property_id,existing_tenancy,proposed_start,proposed_end) values(uid,pid,existing.id,start_day,end_day) on conflict do nothing;return jsonb_build_object('status','overlap');end if;
 select * into assoc from public.management_associations where property_id=pid and active and start_date<=start_day and (end_date is null or end_date>start_day);
 if assoc.id is null and lr is not null then raise exception 'No manager recorded for this tenancy start; leave management rating unanswered';end if;
 insert into private.tenancies(user_id,property_id,start_date,end_date,is_current,rent_paid,association_id,landlord_id) values(uid,pid,start_day,end_day,is_now,paid,assoc.id,assoc.landlord_id) returning id into tid;
 insert into public.reviews(tenancy_id,profile_id,property_id,landlord_id,property_rating,landlord_rating,body) values(tid,(select public_profile_id from private.accounts where user_id=uid),pid,assoc.landlord_id,pr,lr,words) returning id into rid;
 insert into private.review_answers(review_id,self_identifies_woman,recommendation) values(rid,coalesce((p_input->>'woman')::boolean,false),(p_input->>'recommend')::boolean);
 return jsonb_build_object('status','created','id',rid);
end;$$;

create or replace function public.get_my_reviews() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'property_id',r.property_id,'property_name',p.name,'status',r.status,'body',r.body,'propertyRating',r.property_rating,'managerRating',r.landlord_rating,'start',t.start_date,'end',t.end_date,'current',t.is_current,'paid',t.rent_paid,'woman',a.self_identifies_woman,'recommend',a.recommendation,'was_edited',r.was_edited,'archived',t.archived) order by r.created_at desc),'[]'::jsonb)
 from public.reviews r join private.tenancies t on t.id=r.tenancy_id join public.properties p on p.id=r.property_id join private.review_answers a on a.review_id=r.id where t.user_id=auth.uid()
$$;
commit;
