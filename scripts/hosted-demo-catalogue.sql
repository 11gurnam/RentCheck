-- Run only on the explicitly confirmed hosted staging project.
-- Restore the eight original labelled demo fixtures; never relabel real data.
do $$
begin
  if (select accepts_real_data from private.operation_settings where singleton) then
    raise exception 'Close real intake before restoring the demo catalogue';
  end if;
  if (select count(*) from public.properties
      where is_demo and id in (
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000003',
        '20000000-0000-4000-8000-000000000004',
        '20000000-0000-4000-8000-000000000005',
        '20000000-0000-4000-8000-000000000006',
        '20000000-0000-4000-8000-000000000007',
        '20000000-0000-4000-8000-000000000008')) <> 8 then
    raise exception 'Expected original demo fixtures are missing or relabelled';
  end if;
perform public.configure_sample_visibility(true,
  'Owner requested visible labelled dummy listings across eight Indian cities.');
update public.properties set status='published', updated_at=now()
where is_demo and status='hidden' and id in (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000006',
  '20000000-0000-4000-8000-000000000007',
  '20000000-0000-4000-8000-000000000008');
update public.landlords set status='published'
where is_demo and status='hidden' and id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005');
end $$;
