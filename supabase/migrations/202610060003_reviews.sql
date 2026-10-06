begin;
create table private.tenancies (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),property_id uuid not null references public.properties(id),
 start_date date not null,end_date date,is_current boolean not null,rent_paid integer not null check(rent_paid between 0 and 10000000),
 association_id uuid references public.management_associations(id),landlord_id uuid references public.landlords(id),
 constraint tenancy_identity unique(user_id,property_id,start_date) deferrable initially immediate,
 check(start_date<=(now() at time zone 'Asia/Kolkata')::date),
 check((is_current and end_date is null) or (not is_current and end_date>=start_date and end_date<=(now() at time zone 'Asia/Kolkata')::date))
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(),tenancy_id uuid not null unique references private.tenancies(id),
 profile_id uuid not null references public.public_profiles(id),property_id uuid not null references public.properties(id),landlord_id uuid references public.landlords(id),
 property_rating smallint not null check(property_rating between 1 and 5),landlord_rating smallint check(landlord_rating between 1 and 5),
 body text not null check(char_length(btrim(body)) between 10 and 5000),
 status text not null default 'visible' check(status in ('visible','deleted','removed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),was_edited boolean not null default false
);
create index reviews_property_idx on public.reviews(property_id) where status='visible';
create index reviews_landlord_idx on public.reviews(landlord_id) where status='visible';
create table private.review_answers(review_id uuid primary key references public.reviews(id),self_identifies_woman boolean not null default false,recommendation boolean);
create table private.tenancy_conflicts(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),property_id uuid not null references public.properties(id),existing_tenancy uuid not null references private.tenancies(id),proposed_start date not null,proposed_end date,status text not null default 'pending' check(status in ('pending','resolved')),unique(user_id,property_id,existing_tenancy,proposed_start));
alter table private.tenancies enable row level security;alter table private.review_answers enable row level security;alter table private.tenancy_conflicts enable row level security;
alter table public.reviews enable row level security;
revoke all on private.tenancies,private.review_answers,private.tenancy_conflicts,public.reviews from public,anon,authenticated;
grant select(id,profile_id,property_id,landlord_id,property_rating,landlord_rating,body,status,created_at,updated_at,was_edited) on public.reviews to anon,authenticated;
create policy visible_reviews on public.reviews for select to anon,authenticated using(status='visible' and exists(select 1 from public.properties p where p.id=property_id and p.status='published'));
create function private.user_owns_property(p_user uuid,p_property uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.property_contributors where property_id=p_property and user_id=p_user and declared_owner)
$$;
revoke all on function private.user_owns_property(uuid,uuid) from public,anon,authenticated;
create function public.create_review(p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();pid uuid:=(p_input->>'property')::uuid;start_day date:=(p_input->>'start')::date;end_day date:=nullif(p_input->>'end','')::date;is_now boolean:=(p_input->>'current')::boolean;paid integer:=(p_input->>'paid')::integer;pr smallint:=(p_input->>'propertyRating')::smallint;lr smallint:=nullif(p_input->>'managerRating','')::smallint;words text:=btrim(p_input->>'body');tid uuid;rid uuid;existing private.tenancies%rowtype;assoc public.management_associations%rowtype;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_input->>'synthetic' is distinct from 'true' then raise exception 'Only fictional tenancy examples allowed';end if;
 if not exists(select 1 from public.properties where id=pid and status='published') then raise exception 'Property unavailable';end if;
 if private.user_owns_property(uid,pid) then raise exception 'You cannot review your own property' using errcode='42501';end if;
 if start_day is null or is_now is null or start_day>(now() at time zone 'Asia/Kolkata')::date or (is_now and end_day is not null) or (not is_now and (end_day is null or end_day<start_day or end_day>(now() at time zone 'Asia/Kolkata')::date)) then raise exception 'Check tenancy dates';end if;
 if paid is null or paid not between 0 and 10000000 or pr is null or pr not between 1 and 5 or (lr is not null and lr not between 1 and 5) or words is null or char_length(words) not between 10 and 5000 then raise exception 'Check review fields';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||'|'||pid::text,0));
 select id into tid from private.tenancies where user_id=uid and property_id=pid and start_date=start_day;
 if tid is not null then select id into rid from public.reviews where tenancy_id=tid;return jsonb_build_object('status','exists','id',rid);end if;
 select * into existing from private.tenancies where user_id=uid and property_id=pid and daterange(start_date,end_date+1,'[)')&&daterange(start_day,end_day+1,'[)') limit 1;
 if existing.id is not null then insert into private.tenancy_conflicts(user_id,property_id,existing_tenancy,proposed_start,proposed_end) values(uid,pid,existing.id,start_day,end_day) on conflict do nothing;return jsonb_build_object('status','overlap');end if;
 select * into assoc from public.management_associations where property_id=pid and start_date<=start_day and (end_date is null or end_date>start_day);
 if assoc.id is null and lr is not null then raise exception 'No manager recorded for this tenancy start; leave management rating unanswered';end if;
 insert into private.tenancies(user_id,property_id,start_date,end_date,is_current,rent_paid,association_id,landlord_id) values(uid,pid,start_day,end_day,is_now,paid,assoc.id,assoc.landlord_id) returning id into tid;
 insert into public.reviews(tenancy_id,profile_id,property_id,landlord_id,property_rating,landlord_rating,body) values(tid,(select public_profile_id from private.accounts where user_id=uid),pid,assoc.landlord_id,pr,lr,words) returning id into rid;
 insert into private.review_answers(review_id,self_identifies_woman,recommendation) values(rid,coalesce((p_input->>'woman')::boolean,false),(p_input->>'recommend')::boolean);
 return jsonb_build_object('status','created','id',rid);
end;$$;
create function public.get_my_reviews() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'property_id',r.property_id,'property_name',p.name,'status',r.status,'body',r.body,'propertyRating',r.property_rating,'managerRating',r.landlord_rating,'start',t.start_date,'end',t.end_date,'current',t.is_current,'paid',t.rent_paid,'woman',a.self_identifies_woman,'recommend',a.recommendation,'was_edited',r.was_edited) order by r.created_at desc),'[]'::jsonb)
 from public.reviews r join private.tenancies t on t.id=r.tenancy_id join public.properties p on p.id=r.property_id join private.review_answers a on a.review_id=r.id where t.user_id=auth.uid()
$$;
create function private.change_tenancy(p_tenancy uuid,p_current boolean,p_end date,p_paid integer) returns void language plpgsql security definer set search_path='' as $$
declare t private.tenancies%rowtype;
begin
 select * into t from private.tenancies where id=p_tenancy and user_id=auth.uid();if t.id is null then raise exception 'Not your tenancy' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t.user_id::text||'|'||t.property_id::text,0));
 if (p_current and p_end is not null) or (not p_current and (p_end is null or p_end<t.start_date or p_end>(now() at time zone 'Asia/Kolkata')::date)) then raise exception 'Check tenancy dates';end if;
 if exists(select 1 from private.tenancies other where other.user_id=t.user_id and other.property_id=t.property_id and other.id<>t.id and daterange(other.start_date,other.end_date+1,'[)')&&daterange(t.start_date,p_end+1,'[)')) then raise exception 'Changed dates overlap another tenancy';end if;
 update private.tenancies set end_date=p_end,is_current=p_current,rent_paid=p_paid where id=t.id;
end;$$;
revoke all on function private.change_tenancy(uuid,boolean,date,integer) from public,anon,authenticated;
create function public.edit_review(p_review uuid,p_input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r public.reviews%rowtype;
begin
 select reviews.* into r from public.reviews reviews join private.tenancies t on t.id=reviews.tenancy_id where reviews.id=p_review and t.user_id=auth.uid() and reviews.status='visible' for update of reviews;
 if r.id is null then raise exception 'Only the author can edit a visible review' using errcode='42501';end if;
 if private.user_owns_property(auth.uid(),r.property_id) then raise exception 'You cannot review your own property' using errcode='42501';end if;
 if p_input ? 'start' and (p_input->>'start')::date is distinct from (select start_date from private.tenancies where id=r.tenancy_id) then raise exception 'Tenancy start is immutable';end if;
 perform private.change_tenancy(r.tenancy_id,(p_input->>'current')::boolean,nullif(p_input->>'end','')::date,(p_input->>'paid')::integer);
 if r.landlord_id is null and nullif(p_input->>'managerRating','') is not null then raise exception 'No manager recorded for this tenancy';end if;
 update public.reviews set body=btrim(p_input->>'body'),property_rating=(p_input->>'propertyRating')::smallint,landlord_rating=nullif(p_input->>'managerRating','')::smallint,was_edited=true,updated_at=now() where id=r.id;
 update private.review_answers set self_identifies_woman=coalesce((p_input->>'woman')::boolean,false),recommendation=(p_input->>'recommend')::boolean where review_id=r.id;
end;$$;
create function public.update_tenancy(p_review uuid,p_current boolean,p_end date,p_paid integer) returns void language plpgsql security definer set search_path='' as $$
declare tid uuid;begin select r.tenancy_id into tid from public.reviews r join private.tenancies t on t.id=r.tenancy_id where r.id=p_review and t.user_id=auth.uid();if tid is null then raise exception 'Not your tenancy' using errcode='42501';end if;perform private.change_tenancy(tid,p_current,p_end,p_paid);end;$$;
create function public.delete_review(p_review uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.reviews r set status='deleted',updated_at=now() where r.id=p_review and r.status='visible' and exists(select 1 from private.tenancies t where t.id=r.tenancy_id and t.user_id=auth.uid());if not found then raise exception 'Only author can delete a visible review' using errcode='42501';end if;end;$$;
create function public.get_review_feed(p_property uuid default null,p_landlord uuid default null) returns table(id uuid,property_id uuid,landlord_id uuid,alias text,body text,property_rating smallint,landlord_rating smallint,start_date date,end_date date,is_current boolean,rent_paid integer,created_at timestamptz,updated_at timestamptz,was_edited boolean)
language sql stable security definer set search_path='' as $$
 select r.id,r.property_id,r.landlord_id,profile.public_alias,r.body,r.property_rating,r.landlord_rating,t.start_date,t.end_date,t.is_current,t.rent_paid,r.created_at,r.updated_at,r.was_edited from public.reviews r join private.tenancies t on t.id=r.tenancy_id join public.public_profiles profile on profile.id=r.profile_id join public.properties p on p.id=r.property_id
 where r.status='visible' and p.status='published' and (p_property is null or r.property_id=p_property) and (p_landlord is null or r.landlord_id=p_landlord) order by r.created_at desc,r.id limit 100
$$;
revoke all on function public.create_review(jsonb),public.get_my_reviews(),public.edit_review(uuid,jsonb),public.update_tenancy(uuid,boolean,date,integer),public.delete_review(uuid) from public,anon;
grant execute on function public.create_review(jsonb),public.get_my_reviews(),public.edit_review(uuid,jsonb),public.update_tenancy(uuid,boolean,date,integer),public.delete_review(uuid) to authenticated;
revoke all on function public.get_review_feed(uuid,uuid) from public;
grant execute on function public.get_review_feed(uuid,uuid) to anon,authenticated;
create view public.property_scores with(security_invoker=true) as select property_id,count(*) review_count,round(avg(property_rating),2) property_rating from public.reviews where status='visible' group by property_id;
create view public.landlord_scores with(security_invoker=true) as select landlord_id,count(landlord_rating) review_count,round(avg(landlord_rating),2) landlord_rating from public.reviews where status='visible' and landlord_id is not null group by landlord_id;
revoke all on public.property_scores,public.landlord_scores from public,anon,authenticated;grant select on public.property_scores,public.landlord_scores to anon,authenticated;
commit;
