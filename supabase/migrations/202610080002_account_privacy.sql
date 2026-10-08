begin;
create table private.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,kind text not null,message text not null,href text not null check(href like '/%' and href not like '//%'),read_at timestamptz,created_at timestamptz not null default now());
create index notifications_owner_date on private.notifications(user_id,created_at desc);
alter table private.notifications enable row level security;revoke all on private.notifications from public,anon,authenticated;
create function public.get_my_notifications() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc,n.id),'[]'::jsonb) from(select id,kind,message,href,read_at,created_at from private.notifications where user_id=auth.uid() order by created_at desc,id limit 100)n;
$$;
create function public.mark_notification_read(p_notification uuid) returns void language plpgsql security definer set search_path='' as $$
begin update private.notifications set read_at=coalesce(read_at,now()) where id=p_notification and user_id=auth.uid();if not found then raise exception 'Notification unavailable' using errcode='42501';end if;end;$$;
revoke all on function public.get_my_notifications(),public.mark_notification_read(uuid) from public,anon;grant execute on function public.get_my_notifications(),public.mark_notification_read(uuid) to authenticated;
create function private.notify_verification() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status<>old.status then insert into private.notifications(user_id,kind,message,href) select owner_id,'verification','Your tenancy verification is now '||new.status||'. Read the decision on your review.','/reviews/'||new.review_id::text||'/edit' from private.documents where id=new.document_id;end if;return new;end;$$;
create trigger verification_notification after update of status on private.verification_requests for each row execute function private.notify_verification();
create function private.notify_claim() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status<>old.status then insert into private.notifications(user_id,kind,message,href) values(new.user_id,'claim','Your profile claim is now '||new.status||'. Read the decision under Your claims.','/claims');end if;return new;end;$$;
create trigger claim_notification after update of status on private.claims for each row execute function private.notify_claim();
create function private.notify_reply() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into private.notifications(user_id,kind,message,href) select t.user_id,'reply',case when tg_op='INSERT' then 'A representative replied to your review.' else 'A representative updated their reply to your review.' end,'/properties/'||r.property_id::text||'#experiences' from public.reviews r join private.tenancies t on t.id=r.tenancy_id join private.claims c on c.id=new.claim_id where r.id=new.review_id and t.user_id<>c.user_id and r.status='visible' and c.status='approved';return new;end;$$;
create trigger reply_notification after insert or update of body on public.replies for each row execute function private.notify_reply();
create function private.notify_report() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status<>old.status then
 insert into private.notifications(user_id,kind,message,href) values(new.user_id,'report','Your review report was decided: '||new.status||'.','/account/notifications');
 if new.status='removed' then insert into private.notifications(user_id,kind,message,href) select t.user_id,'moderation','Your review was removed following moderation.','/account/reviews' from public.reviews r join private.tenancies t on t.id=r.tenancy_id where r.id=new.review_id and t.user_id<>new.user_id;end if;
end if;return new;end;$$;
create trigger report_notification after update of status on private.reports for each row execute function private.notify_report();
create function private.notify_photo_report() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status<>old.status then
 insert into private.notifications(user_id,kind,message,href) values(new.user_id,'photo_report','Your photo report was decided: '||new.status||'.','/account/notifications');
 if new.status='removed' then insert into private.notifications(user_id,kind,message,href) select owner_id,'moderation','Your landlord photo was removed following moderation.','/properties/'||property_id::text from private.property_photos where id=new.photo_id and owner_id<>new.user_id;end if;
end if;return new;end;$$;
create trigger photo_report_notification after update of status on private.photo_reports for each row execute function private.notify_photo_report();
revoke all on function private.notify_verification(),private.notify_claim(),private.notify_reply(),private.notify_report(),private.notify_photo_report() from public,anon,authenticated,service_role;

create table private.media_purge_queue(id uuid primary key default gen_random_uuid(),user_id uuid not null,bucket text not null check(bucket in('review-photos','rental-documents')),object_path text not null,created_at timestamptz not null default now(),unique(bucket,object_path));
alter table private.media_purge_queue enable row level security;revoke all on private.media_purge_queue from public,anon,authenticated;
create function public.get_media_purge_jobs(p_user uuid default null) returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(to_jsonb(j)),'[]'::jsonb) from(select id,bucket,object_path from private.media_purge_queue where p_user is null or user_id=p_user order by created_at,id limit 100)j;
$$;
create function public.finish_media_purge(p_jobs uuid[]) returns void language sql security definer set search_path='' as $$delete from private.media_purge_queue where id=any(p_jobs);$$;
revoke all on function public.get_media_purge_jobs(uuid),public.finish_media_purge(uuid[]) from public,anon,authenticated;grant execute on function public.get_media_purge_jobs(uuid),public.finish_media_purge(uuid[]) to service_role;
create function private.erase_account_content() returns trigger language plpgsql security definer set search_path='' as $$
declare profile uuid;
begin perform private.catalogue_lock();select public_profile_id into profile from private.accounts where user_id=old.id;
insert into private.media_purge_queue(user_id,bucket,object_path) select old.id,'rental-documents',object_path from private.documents where owner_id=old.id on conflict(bucket,object_path) do nothing;
insert into private.media_purge_queue(user_id,bucket,object_path) select old.id,'review-photos',ph.object_path from private.review_photos ph join public.reviews r on r.id=ph.review_id join private.tenancies t on t.id=r.tenancy_id where t.user_id=old.id on conflict(bucket,object_path) do nothing;
insert into private.media_purge_queue(user_id,bucket,object_path) select old.id,'review-photos',object_path from private.property_photos where owner_id=old.id on conflict(bucket,object_path) do nothing;
delete from private.photo_reports where user_id=old.id or photo_id in(select id from private.property_photos where owner_id=old.id);
delete from private.property_photos where owner_id=old.id;
delete from private.reports where user_id=old.id or review_id in(select r.id from public.reviews r join private.tenancies t on t.id=r.tenancy_id where t.user_id=old.id);
delete from public.replies where profile_id=profile or claim_id in(select id from private.claims where user_id=old.id) or review_id in(select r.id from public.reviews r join private.tenancies t on t.id=r.tenancy_id where t.user_id=old.id);
delete from private.verification_requests where document_id in(select id from private.documents where owner_id=old.id) or review_id in(select r.id from public.reviews r join private.tenancies t on t.id=r.tenancy_id where t.user_id=old.id);
delete from private.claims where user_id=old.id;
delete from private.documents where owner_id=old.id;
delete from private.review_photos where review_id in(select r.id from public.reviews r join private.tenancies t on t.id=r.tenancy_id where t.user_id=old.id);
delete from private.review_answers where review_id in(select r.id from public.reviews r join private.tenancies t on t.id=r.tenancy_id where t.user_id=old.id);
delete from public.reviews where tenancy_id in(select id from private.tenancies where user_id=old.id);
delete from private.tenancy_conflicts where user_id=old.id or existing_tenancy in(select id from private.tenancies where user_id=old.id);
delete from private.tenancies where user_id=old.id;
delete from private.accounts where user_id=old.id;
delete from public.public_profiles where id=profile;
insert into private.audit_events(actor_id,action,entity_id,reason) values(null,'account_deleted',old.id,'Account closure removed user content; private media purge queued.');
return old;end;$$;
create trigger erase_account_before_auth_delete before delete on auth.users for each row execute function private.erase_account_content();
revoke all on function private.erase_account_content() from public,anon,authenticated,service_role;
commit;
