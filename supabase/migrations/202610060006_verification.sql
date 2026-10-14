begin;
create table private.documents(id uuid primary key,owner_id uuid not null references auth.users(id),object_path text not null unique,created_at timestamptz not null default now());
create table private.verification_requests(id uuid primary key default gen_random_uuid(),review_id uuid not null references public.reviews(id),document_id uuid not null unique references private.documents(id),status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),reason text,decided_by uuid,created_at timestamptz not null default now(),decided_at timestamptz);
create unique index one_active_verification on private.verification_requests(review_id) where status in ('pending','approved');
create table private.audit_events(id uuid primary key default gen_random_uuid(),actor_id uuid,action text not null,entity_id uuid not null,before_value jsonb,after_value jsonb,reason text not null check(char_length(btrim(reason)) between 10 and 2000),created_at timestamptz not null default now());
alter table private.documents enable row level security;alter table private.verification_requests enable row level security;alter table private.audit_events enable row level security;
revoke all on private.documents,private.verification_requests,private.audit_events from public,anon,authenticated;
create function private.require_administrator() returns void language plpgsql security definer set search_path='' as $$
begin if not public.is_administrator() then raise exception 'Administrator access required' using errcode='42501';end if;end;$$;
revoke all on function private.require_administrator() from public,anon,authenticated;
create function private.immutable_audit() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Audit records are immutable';end;$$;
create trigger audit_immutable before update or delete on private.audit_events for each row execute function private.immutable_audit();
revoke all on function private.immutable_audit() from public,anon,authenticated;
create function public.register_verification_document(p_user uuid,p_review uuid,p_document uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.reviews%rowtype;request_id uuid;path text:='verification/'||p_document::text||'.jpg';
begin
select reviews.* into r from public.reviews reviews join private.tenancies t on t.id=reviews.tenancy_id where reviews.id=p_review and reviews.status='visible' and t.user_id=p_user for update of reviews;
if r.id is null then raise exception 'Author access required' using errcode='42501';end if;
if exists(select 1 from private.verification_requests where review_id=p_review and status in ('pending','approved')) then raise exception 'This review already has a pending or approved request';end if;
if not exists(select 1 from storage.objects where bucket_id='rental-documents' and name=path) then raise exception 'Document not uploaded';end if;
insert into private.documents(id,owner_id,object_path) values(p_document,p_user,path);
insert into private.verification_requests(review_id,document_id) values(p_review,p_document) returning id into request_id;
return request_id;end;$$;
revoke all on function public.register_verification_document(uuid,uuid,uuid) from public,anon,authenticated;grant execute on function public.register_verification_document(uuid,uuid,uuid) to service_role;
create function public.get_my_verifications() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'review_id',v.review_id,'document_id',v.document_id,'status',v.status,'reason',v.reason) order by v.created_at desc),'[]'::jsonb) from private.verification_requests v join private.documents d on d.id=v.document_id where d.owner_id=auth.uid();
$$;
create function public.get_authorized_document(p_document uuid) returns text language sql stable security definer set search_path='' as $$
select object_path from private.documents where id=p_document and (owner_id=auth.uid() or public.is_administrator());
$$;
create function public.get_admin_verifications() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();return (select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'review_id',v.review_id,'document_id',v.document_id,'status',v.status,'reason',v.reason,'alias',p.public_alias,'property',pr.name) order by v.created_at),'[]'::jsonb) from private.verification_requests v join public.reviews r on r.id=v.review_id join public.public_profiles p on p.id=r.profile_id join public.properties pr on pr.id=r.property_id);end;$$;
create function public.decide_verification(p_request uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v private.verification_requests%rowtype;
begin perform private.require_administrator();
if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Enter a decision reason of 10 to 2000 characters';end if;
select * into v from private.verification_requests where id=p_request for update;
if v.id is null or not ((v.status='pending' and p_decision in ('approved','rejected')) or (v.status='approved' and p_decision='revoked')) then raise exception 'Invalid verification transition';end if;
if p_decision='approved' and not exists(select 1 from public.reviews where id=v.review_id and status='visible') then raise exception 'Only visible reviews can be verified';end if;
update private.verification_requests set status=p_decision,reason=btrim(p_reason),decided_by=auth.uid(),decided_at=now() where id=v.id;
insert into private.audit_events(actor_id,action,entity_id,before_value,after_value,reason) values(auth.uid(),'verification_decision',v.id,jsonb_build_object('status',v.status),jsonb_build_object('status',p_decision),btrim(p_reason));end;$$;
create function public.get_admin_audit() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin perform private.require_administrator();return (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb) from (select * from private.audit_events order by created_at desc,id limit 200) e);end;$$;
revoke all on function public.get_my_verifications(),public.get_authorized_document(uuid),public.get_admin_verifications(),public.decide_verification(uuid,text,text),public.get_admin_audit() from public,anon;
grant execute on function public.get_my_verifications(),public.get_authorized_document(uuid),public.get_admin_verifications(),public.decide_verification(uuid,text,text),public.get_admin_audit() to authenticated;
create function public.review_is_verified(p_review uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from private.verification_requests v join public.reviews r on r.id=v.review_id join public.properties p on p.id=r.property_id where v.review_id=p_review and v.status='approved' and r.status='visible' and p.status='published');
$$;
create function public.womens_recommendation_counts(p_property uuid default null) returns table(property_id uuid,positive_count bigint,eligible_count bigint,recommended boolean) language sql stable security definer set search_path='' as $$
select p.id,coalesce(c.positive,0),coalesce(c.total,0),coalesce(c.positive>=3 and c.positive*2>c.total,false)
from public.properties p left join lateral (
select count(*) filter(where a.recommendation) positive,count(*) total from public.reviews r join private.review_answers a on a.review_id=r.id where r.property_id=p.id and r.status='visible' and a.self_identifies_woman and a.recommendation is not null and exists(select 1 from private.verification_requests v where v.review_id=r.id and v.status='approved')
) c on true where p.status='published' and (p_property is null or p.id=p_property);
$$;
revoke all on function public.review_is_verified(uuid),public.womens_recommendation_counts(uuid) from public;grant execute on function public.review_is_verified(uuid),public.womens_recommendation_counts(uuid) to anon,authenticated;
commit;
