begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.public_profiles (
  id uuid primary key default gen_random_uuid(),
  public_alias text not null check (
    public_alias = btrim(public_alias)
    and char_length(public_alias) between 3 and 40
    and public_alias !~ '[@<>[:cntrl:]]'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table private.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_profile_id uuid not null unique references public.public_profiles(id),
  created_at timestamptz not null default now()
);
create table private.administrator_grants (
  user_id uuid primary key references private.accounts(user_id) on delete cascade,
  granted_at timestamptz not null default now(),
  reason text not null check (length(btrim(reason)) > 0)
);

alter table public.public_profiles enable row level security;
alter table private.accounts enable row level security;
alter table private.administrator_grants enable row level security;
revoke all on public.public_profiles from public, anon, authenticated;
revoke all on private.accounts, private.administrator_grants from public, anon, authenticated;
grant select (id, public_alias, created_at, updated_at) on public.public_profiles to anon, authenticated;
create policy "Only alias fields are public" on public.public_profiles for select to anon, authenticated using (true);

create function private.create_account()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  profile_id uuid := gen_random_uuid();
  selected_alias text := btrim(new.raw_user_meta_data->>'public_alias');
begin
  -- Google names/photos and client-supplied roles never supply public identity or authority.
  if selected_alias is null or char_length(selected_alias) not between 3 and 40
    or selected_alias ~ '[@<>[:cntrl:]]' then
    selected_alias := 'Tenant-' || left(profile_id::text, 8);
  end if;
  insert into public.public_profiles (id, public_alias) values (profile_id, selected_alias);
  insert into private.accounts (user_id, public_profile_id) values (new.id, profile_id);
  return new;
end;
$$;
revoke all on function private.create_account() from public, anon, authenticated;
create trigger create_rentcheck_account after insert on auth.users for each row execute function private.create_account();

create function public.get_my_account()
returns table (profile_id uuid, public_alias text, is_administrator boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.public_alias, exists (
    select 1 from private.administrator_grants g where g.user_id = auth.uid()
  )
  from private.accounts a join public.public_profiles p on p.id = a.public_profile_id
  where a.user_id = auth.uid();
$$;
revoke all on function public.get_my_account() from public, anon, authenticated;
grant execute on function public.get_my_account() to authenticated;

create function public.is_administrator()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.administrator_grants where user_id = auth.uid());
$$;
revoke all on function public.is_administrator() from public, anon, authenticated;
grant execute on function public.is_administrator() to authenticated;

create function public.set_public_alias(requested_alias text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if requested_alias is null or char_length(btrim(requested_alias)) not between 3 and 40
    or requested_alias ~ '[@<>[:cntrl:]]' then
    raise exception 'Invalid alias' using errcode = '22023';
  end if;
  update public.public_profiles set public_alias = btrim(requested_alias), updated_at = now()
    where id = (select public_profile_id from private.accounts where user_id = auth.uid());
  if not found then raise exception 'Account profile unavailable'; end if;
end;
$$;
revoke all on function public.set_public_alias(text) from public, anon, authenticated;
grant execute on function public.set_public_alias(text) to authenticated;

-- Account erasure removes the orphaned public alias without granting API deletion access.
create function private.remove_account_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.public_profiles where id = old.public_profile_id;
  return old;
end;
$$;
revoke all on function private.remove_account_profile() from public, anon, authenticated;
create trigger remove_account_profile after delete on private.accounts for each row execute function private.remove_account_profile();

commit;
