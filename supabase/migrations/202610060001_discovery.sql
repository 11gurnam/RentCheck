begin;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;
create table public.properties (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(btrim(name)) between 3 and 120),
 address text not null check(char_length(btrim(address)) between 5 and 300),
 state text not null check(char_length(btrim(state)) between 2 and 80),
 city text not null check(char_length(btrim(city)) between 2 and 80),
 locality text not null check(char_length(btrim(locality)) between 2 and 100),
 property_type text not null check(property_type in ('Flat','House','PG','Hostel')),
 rent_min integer not null check(rent_min between 0 and 10000000),
 rent_max integer not null check(rent_max between rent_min and 10000000),
 description text not null default '' check(char_length(description)<=3000),
 status text not null default 'published' check(status in ('published','hidden','merged')),
 is_demo boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.landlords (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(btrim(name)) between 3 and 120),
 description text not null default '' check(char_length(description)<=3000),
 status text not null default 'published' check(status in ('published','hidden','merged')),
 is_demo boolean not null default true
);
create table public.management_associations (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id),
 landlord_id uuid not null references public.landlords(id), start_date date not null, end_date date,
 check(end_date is null or end_date>start_date),
 exclude using gist (property_id with =, daterange(start_date,end_date,'[)') with &&)
);
create index properties_location_idx on public.properties(state,city,locality) where status='published';
create index associations_landlord_idx on public.management_associations(landlord_id);
alter table public.properties enable row level security;
alter table public.landlords enable row level security;
alter table public.management_associations enable row level security;
revoke all on public.properties,public.landlords,public.management_associations from public,anon,authenticated;
grant select on public.properties,public.landlords,public.management_associations to anon,authenticated;
create policy published_properties on public.properties for select to anon,authenticated using(status='published');
create policy published_landlords on public.landlords for select to anon,authenticated using(status='published');
create policy visible_associations on public.management_associations for select to anon,authenticated using(
 exists(select 1 from public.properties p where p.id=property_id and p.status='published') and
 exists(select 1 from public.landlords l where l.id=landlord_id and l.status='published')
);
create view public.property_discovery with(security_invoker=true) as
select p.*, current_manager.landlord_id, current_manager.landlord_name
from public.properties p left join lateral (
 select a.landlord_id,l.name landlord_name from public.management_associations a
 join public.landlords l on l.id=a.landlord_id
 where a.property_id=p.id and a.start_date<=current_date and (a.end_date is null or a.end_date>current_date)
) current_manager on true;
revoke all on public.property_discovery from public,anon,authenticated;
grant select on public.property_discovery to anon,authenticated;
create function public.search_properties(p_query text default '',p_state text default '',p_city text default '',p_locality text default '',p_type text default '',p_min integer default 0,p_max integer default 10000000,p_page integer default 1)
returns table(id uuid,name text,address text,state text,city text,locality text,property_type text,rent_min integer,rent_max integer,description text,is_demo boolean,landlord_id uuid,landlord_name text,total_count bigint)
language sql stable security invoker set search_path='' as $$
 select p.id,p.name,p.address,p.state,p.city,p.locality,p.property_type,p.rent_min,p.rent_max,p.description,p.is_demo,p.landlord_id,p.landlord_name,count(*) over()
 from public.property_discovery p
 where (p_state='' or p.state=p_state) and (p_city='' or p.city=p_city)
 and (p_locality='' or (p_city<>'' and p.locality=p_locality)) and (p_type='' or p.property_type=p_type)
 and p.rent_min<=p_max and p.rent_max>=p_min and p_min>=0 and p_max>=p_min
 and (p_query='' or concat_ws(' ',p.name,p.address,p.city,p.locality,p.landlord_name) ilike '%'||replace(replace(replace(left(p_query,120),'\','\\'),'%','\%'),'_','\_')||'%'
 or exists(select 1 from public.management_associations a join public.landlords l on l.id=a.landlord_id where a.property_id=p.id and l.name ilike '%'||replace(replace(replace(left(p_query,120),'\','\\'),'%','\%'),'_','\_')||'%'))
 order by p.city,p.name,p.id limit 12 offset (least(greatest(p_page,1),10000)-1)*12
$$;
revoke all on function public.search_properties(text,text,text,text,text,integer,integer,integer) from public;
grant execute on function public.search_properties(text,text,text,text,text,integer,integer,integer) to anon,authenticated;
-- Synthetic demonstration records, never real rental listings or real management claims.
insert into public.landlords(id,name,description) values
 ('10000000-0000-4000-8000-000000000001','Demo North Homes','Synthetic management profile for testing.'),
 ('10000000-0000-4000-8000-000000000002','Demo Western Living','Synthetic management profile for testing.'),
 ('10000000-0000-4000-8000-000000000003','Demo Southern Spaces','Synthetic management profile for testing.'),
 ('10000000-0000-4000-8000-000000000004','Demo Previous Management','Historical synthetic manager; not current.'),
 ('10000000-0000-4000-8000-000000000005','Demo Pink City Homes','Synthetic management profile for testing.');
insert into public.properties(id,name,address,state,city,locality,property_type,rent_min,rent_max,description) values
 ('20000000-0000-4000-8000-000000000001','Demo Neem Courtyard','Demo Lane 12, Central Park','Delhi','New Delhi','Central Park','Flat',18000,26000,'A fictional courtyard flat used to explore RentCheck.'),
 ('20000000-0000-4000-8000-000000000002','Demo Sea Breeze PG','Demo Road 24, Andheri','Maharashtra','Mumbai','Andheri','PG',10000,16000,'A fictional shared accommodation example.'),
 ('20000000-0000-4000-8000-000000000003','Demo Garden House','Demo Avenue 8, Indiranagar','Karnataka','Bengaluru','Indiranagar','House',32000,48000,'A fictional garden house example.'),
 ('20000000-0000-4000-8000-000000000004','Demo Lotus Hostel','Demo Street 5, Adyar','Tamil Nadu','Chennai','Adyar','Hostel',6500,10000,'A fictional hostel example.'),
 ('20000000-0000-4000-8000-000000000005','Demo Rose Studio','Demo Lane 7, Central Park','Rajasthan','Jaipur','Central Park','Flat',9000,14000,'A fictional studio; its locality name also occurs in another city.'),
 ('20000000-0000-4000-8000-000000000006','Demo Banyan PG','Demo Road 3, Baner','Maharashtra','Pune','Baner','PG',8000,13000,'A fictional PG example.'),
 ('20000000-0000-4000-8000-000000000007','Demo Lake House','Demo Avenue 18, Gachibowli','Telangana','Hyderabad','Gachibowli','House',22000,34000,'A fictional independent house example.'),
 ('20000000-0000-4000-8000-000000000008','Demo Mango Flats','Demo Street 9, Salt Lake','West Bengal','Kolkata','Salt Lake','Flat',14000,21000,'A fictional apartment example.');
insert into public.management_associations(property_id,landlord_id,start_date,end_date) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','2020-01-01','2025-01-01'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2025-01-01',null),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','2025-01-01',null),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','2025-01-01',null),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','2025-01-01',null),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005','2025-01-01',null),
 ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','2025-01-01',null),
 ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000003','2025-01-01',null);
commit;
