begin;
alter table public.properties add column postal_code text check(postal_code is null or postal_code ~ '^[1-9][0-9]{5}$');
grant select(postal_code) on public.properties to anon,authenticated;
alter function public.create_property(jsonb,boolean) set schema private;
alter function private.create_property(jsonb,boolean) rename to create_property_without_location;
revoke all on function private.create_property_without_location(jsonb,boolean) from public,anon,authenticated,service_role;
create function public.create_property(p_input jsonb,p_acknowledged boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare pid uuid;lat numeric:=nullif(p_input->>'latitude','')::numeric;lon numeric:=nullif(p_input->>'longitude','')::numeric;pin text:=nullif(p_input->>'postalCode','');
begin
 if pin is not null and pin !~ '^[1-9][0-9]{5}$' then raise exception 'Enter a six-digit PIN code';end if;
 if (lat is null)<>(lon is null) or lat not between 6 and 38 or lon not between 68 and 98 then raise exception 'Choose a property location in India';end if;
 if lat is not null and not coalesce((p_input->>'shareLocation')::boolean,false) then raise exception 'Confirm public sharing of the property pin';end if;
 pid:=private.create_property_without_location(p_input,p_acknowledged);
 update public.properties set postal_code=pin where id=pid;
 if lat is not null then insert into public.property_locations(property_id,latitude,longitude,precision)values(pid,lat,lon,'exact');end if;
 return pid;
end;$$;
revoke all on function public.create_property(jsonb,boolean)from public,anon,authenticated,service_role;
grant execute on function public.create_property(jsonb,boolean)to authenticated;
commit;
