-- Preserve the association ID contract used by dated corrections and API clients.
-- The Phase 12 mode guard must not discard the original UUID result.
drop function public.maintain_association(uuid,uuid,date,date,uuid,text);
create function public.maintain_association(p_property uuid,p_landlord uuid,p_start date,p_end date,p_replace uuid,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  perform private.require_administrator();
  perform private.catalogue_lock();
  if (select is_demo from public.properties where id=p_property) is distinct from
     (select is_demo from public.landlords where id=p_landlord) then
    raise exception 'Property and manager must share demonstration status';
  end if;
  return private.maintain_association_before_mode(p_property,p_landlord,p_start,p_end,p_replace,p_reason);
end;
$$;
revoke all on function public.maintain_association(uuid,uuid,date,date,uuid,text) from public,anon;
grant execute on function public.maintain_association(uuid,uuid,date,date,uuid,text) to authenticated;
