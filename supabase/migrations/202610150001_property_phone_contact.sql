begin;
create table private.property_contact_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 phone text not null default '' check(phone='' or phone ~ '^\+91[6-9][0-9]{9}$'),
 show_publicly boolean not null default false,
 updated_at timestamptz not null default now(),
 check(not show_publicly or phone<>'')
);
alter table private.property_contact_settings enable row level security;
revoke all on private.property_contact_settings from public,anon,authenticated;

create function public.get_my_property_contact_settings() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('phone',coalesce(s.phone,''),'show_publicly',coalesce(s.show_publicly,false),
 'has_claim',exists(select 1 from private.claims c where c.user_id=auth.uid() and c.property_id is not null),
 'approved',exists(select 1 from private.claims c where c.user_id=auth.uid() and c.property_id is not null and c.status='approved'))
 from(select 1)x left join private.property_contact_settings s on s.user_id=auth.uid() where auth.uid() is not null;
$$;
create function public.set_property_contact_settings(p_phone text,p_show_publicly boolean) returns void language plpgsql security definer set search_path='' as $$
declare normalized text:=regexp_replace(coalesce(p_phone,''),'[[:space:]()-]','','g');
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform private.catalogue_lock();
 if not exists(select 1 from private.claims c where c.user_id=auth.uid() and c.property_id is not null) then raise exception 'A property claim is required' using errcode='42501';end if;
 if normalized ~ '^[6-9][0-9]{9}$' then normalized:='+91'||normalized;end if;
 if normalized<>'' and normalized !~ '^\+91[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit Indian mobile number or +91 number';end if;
 if coalesce(p_show_publicly,false) and (normalized='' or not exists(select 1 from private.claims c where c.user_id=auth.uid() and c.property_id is not null and c.status='approved')) then raise exception 'A phone number and approved property claim are required for public display';end if;
 insert into private.property_contact_settings(user_id,phone,show_publicly) values(auth.uid(),normalized,coalesce(p_show_publicly,false))
 on conflict(user_id) do update set phone=excluded.phone,show_publicly=excluded.show_publicly,updated_at=now();
end;$$;
create function public.get_property_contact_numbers(p_property uuid) returns table(alias text,phone text) language sql stable security definer set search_path='' as $$
 select distinct pp.public_alias,s.phone from private.claims c
 join public.properties p on p.id=c.property_id and p.status='published'
 join private.accounts a on a.user_id=c.user_id and a.status='active'
 join public.public_profiles pp on pp.id=a.public_profile_id
 join private.property_contact_settings s on s.user_id=c.user_id and s.show_publicly and s.phone<>''
 where c.property_id=p_property and c.status='approved';
$$;
revoke all on function public.get_my_property_contact_settings(),public.set_property_contact_settings(text,boolean),public.get_property_contact_numbers(uuid) from public,anon,authenticated;
grant execute on function public.get_my_property_contact_settings(),public.set_property_contact_settings(text,boolean) to authenticated;
grant execute on function public.get_property_contact_numbers(uuid) to anon,authenticated;
commit;
