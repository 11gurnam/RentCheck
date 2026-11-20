begin;

create or replace function public.get_my_claims()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(item.value || jsonb_build_object(
    'is_demo', document.is_demo,
    'expires_at', document.expires_at,
    'evidence_expired', document.expires_at <= now() or document.object_path is null,
    'created_at', claim.created_at,
    'decided_at', claim.decided_at
  ) order by item.ordinality), '[]'::jsonb)
  from jsonb_array_elements(private.get_my_claims_original()) with ordinality item(value, ordinality)
  join private.claims claim on claim.id = (item.value->>'id')::uuid and claim.user_id = auth.uid()
  join private.documents document on document.id = (item.value->>'document_id')::uuid;
$$;

notify pgrst, 'reload schema';
commit;
