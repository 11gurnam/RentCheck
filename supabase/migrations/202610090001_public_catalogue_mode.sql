begin;
alter table private.operation_settings add column allows_demo_data boolean not null default true;
create or replace function public.get_operation_mode() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('accepts_real_data',accepts_real_data,'evidence_retention_days',evidence_retention_days,'allows_demo_data',allows_demo_data) from private.operation_settings where singleton;
$$;
create or replace function private.check_record_mode(p_demo boolean,p_consent boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_demo is null then raise exception 'Declare demonstration or real data'; end if;
 if p_demo and not(select allows_demo_data from private.operation_settings where singleton) then raise exception 'Demonstration contributions disabled'; end if;
 if not p_demo and (not coalesce(p_consent,false) or not(select accepts_real_data from private.operation_settings where singleton)) then raise exception 'Real-data intake disabled or consent missing'; end if;
end;
$$;
create function public.configure_sample_visibility(p_public boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare property_count integer:=0; landlord_count integer:=0;
begin
 perform private.catalogue_lock();
 if p_public is null or p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Choose visibility and an audit reason'; end if;
 update private.operation_settings set allows_demo_data=p_public where singleton;
 if not p_public then
  update public.properties set status='hidden',updated_at=now() where is_demo and status='published';
  get diagnostics property_count=row_count;
  update public.landlords set status='hidden' where is_demo and status='published';
  get diagnostics landlord_count=row_count;
 end if;
 insert into private.audit_events(actor_id,action,entity_id,reason,after_value) values(null,'sample_visibility_configured','00000000-0000-4000-8000-000000000012',btrim(p_reason),jsonb_build_object('allows_demo_data',p_public,'hidden_properties',property_count,'hidden_landlords',landlord_count));
end;
$$;
revoke all on function public.configure_sample_visibility(boolean,text) from public,anon,authenticated;
grant execute on function public.configure_sample_visibility(boolean,text) to service_role;
commit;
