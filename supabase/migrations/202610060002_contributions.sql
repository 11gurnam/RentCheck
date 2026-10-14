begin;
create extension if not exists pg_trgm with schema extensions;
create function private.location_key(value text) returns text language sql immutable set search_path='' as $$select regexp_replace(lower(btrim(value)),'[^[:alnum:]]','','g')$$;
revoke all on function private.location_key(text) from public,anon,authenticated;
create unique index properties_exact_address on public.properties(private.location_key(state),private.location_key(city),private.location_key(address)) where status<>'merged';
create table private.saved_properties (
 user_id uuid not null references auth.users(id) on delete cascade, property_id uuid not null references public.properties(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(user_id,property_id)
);
create table private.property_contributors (
 property_id uuid primary key references public.properties(id) on delete cascade,user_id uuid references auth.users(id) on delete set null,
 declared_owner boolean not null default false
);
create table private.duplicate_candidates (
 id uuid primary key default gen_random_uuid(),source_id uuid not null references public.properties(id) on delete cascade,target_id uuid not null references public.properties(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','distinct','merged')),reason text not null, unique(source_id,target_id),check(source_id<>target_id)
);
alter table private.saved_properties enable row level security;
alter table private.property_contributors enable row level security;
alter table private.duplicate_candidates enable row level security;
revoke all on private.saved_properties,private.property_contributors,private.duplicate_candidates from public,anon,authenticated;
create function public.get_saved_properties() returns table(property_id uuid) language sql stable security definer set search_path='' as $$
 select s.property_id from private.saved_properties s join public.properties p on p.id=s.property_id where s.user_id=auth.uid() and p.status='published' order by s.created_at desc,s.property_id
$$;
create function public.set_saved_property(p_property uuid,p_saved boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if not exists(select 1 from public.properties where id=p_property and status='published') then raise exception 'Property unavailable';end if;
 if p_saved then insert into private.saved_properties(user_id,property_id) values(auth.uid(),p_property) on conflict do nothing;
 else delete from private.saved_properties where user_id=auth.uid() and property_id=p_property;end if;
end;$$;
create function public.find_property_duplicates(p_state text,p_city text,p_address text,p_name text) returns table(id uuid,name text,address text,city text,exact boolean)
language sql stable security definer set search_path='' as $$
 select p.id,p.name,p.address,p.city,private.location_key(p.address)=private.location_key(p_address) from public.properties p
 where auth.uid() is not null and p.status='published' and private.location_key(p.state)=private.location_key(p_state) and private.location_key(p.city)=private.location_key(p_city)
 and (private.location_key(p.address)=private.location_key(p_address) or extensions.similarity(lower(p.address),lower(p_address))>=0.55 or extensions.similarity(lower(p.name),lower(p_name))>=0.7)
 order by (private.location_key(p.address)=private.location_key(p_address)) desc,p.name,p.id limit 8
$$;
create function public.create_property(p_input jsonb,p_acknowledged boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;candidate record;exact_match boolean;has_candidates boolean;v_state text:=btrim(p_input->>'state');v_city text:=btrim(p_input->>'city');v_address text:=btrim(p_input->>'address');v_name text:=btrim(p_input->>'name');
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_input->>'synthetic' is distinct from 'true' then raise exception 'Only synthetic demo records are allowed';end if;
 perform pg_advisory_xact_lock(hashtextextended(private.location_key(v_state)||'|'||private.location_key(v_city)||'|'||private.location_key(v_address),0));
 select coalesce(bool_or(d.exact),false),count(*)>0 into exact_match,has_candidates from public.find_property_duplicates(v_state,v_city,v_address,v_name) d;
 if exact_match then raise exception 'This address already has a profile';end if;
 if has_candidates and not coalesce(p_acknowledged,false) then raise exception 'Review likely duplicates before continuing';end if;
 insert into public.properties(name,address,state,city,locality,property_type,rent_min,rent_max,description,is_demo)
 values(v_name,v_address,v_state,v_city,btrim(p_input->>'locality'),p_input->>'type',(p_input->>'min')::integer,(p_input->>'max')::integer,coalesce(p_input->>'description',''),true) returning id into result_id;
 insert into private.property_contributors(property_id,user_id,declared_owner) values(result_id,auth.uid(),coalesce((p_input->>'declaredOwner')::boolean,false));
 for candidate in select * from public.find_property_duplicates(v_state,v_city,v_address,v_name) where id<>result_id loop
 insert into private.duplicate_candidates(source_id,target_id,reason) values(result_id,candidate.id,'Similar name or address in the same city; administrator review required');end loop;
 return result_id;
end;$$;
revoke all on function public.get_saved_properties(),public.set_saved_property(uuid,boolean),public.find_property_duplicates(text,text,text,text),public.create_property(jsonb,boolean) from public,anon;
grant execute on function public.get_saved_properties(),public.set_saved_property(uuid,boolean),public.find_property_duplicates(text,text,text,text),public.create_property(jsonb,boolean) to authenticated;
commit;
