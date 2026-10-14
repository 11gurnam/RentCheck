begin;
-- Existing evidence buckets may predate PDF support. Match the normalized formats
-- produced by the document sanitizer; do not change bucket privacy or access rules.
update storage.buckets
set allowed_mime_types=array['image/jpeg','application/pdf']
where id='rental-documents';
commit;
