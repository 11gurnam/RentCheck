# Phase 4 — Tenancy reviews
Branch phase-04-reviews depends on unmerged Phase3 final docs bfbf8c05ff256fc12cc7521c1b27825d49a2097b. No merge or deployment.

Adds canonical private tenancies, one review per tenancy, author dashboard/edit/delete, optional separately uploaded photos, public separate property/manager scores, historic manager snapshots and minimum-property-rating URL search.

Identity is account/property/start calendar date, with a deferrable unique key and one review per tenancy. Transaction lock serializes concurrent and overlapping submissions. Repeat returns existing review without overwriting. Overlap creates a private administrator conflict entry. Start cannot be changed; end/rent can be changed with overlap validation. Deleted records keep canonical tombstones and may close tenancy dates without restoring public text. Voluntarily declared owned examples cannot be reviewed; trusted claims extend this in Phase6.

Migrations003–005 apply incrementally. Storage is private and denies API-role reads/writes; server validates real image format, 5 MiB, 20M pixels, non-animation, re-encodes JPEG and strips metadata. Server-only media client uses an ignored service key; authorization is verified before upload and rechecked by service-only registration RPC. Three photos per review, locked transaction. Public photo API checks current review/property visibility each request, no cache or signed URL. Soft deletion hides photo immediately. Private blob retention is intentional for prototype audit; physical erasure and lifecycle policy require deployment configuration.

Run backend:env to provision local private bucket and server key; Google helper preserves provider/volume. Storage provisioning uses its API after startup rather than assuming storage tables exist before CLI migrations on a fresh project. Hosted setup must create the private review-photos bucket with JPEG-only/5MiB and configure the server-only key; never publish it.

Feed displays latest100 reviews; score views aggregate all visible reviews. No fabricated ratings or gender inference. Explicit optional private answers are stored for Phase5 eligibility.

[Tests](test-cases.md), [beginner checks](review-checklist.md). Technical and remote delivery results recorded after execution. User review pending.


Local acceptance PASS: lint/types/unit55/build, SQL65, live API7, full browser54; axe/overflow across3 sizes and desktop/phone screenshot inspection. Browser corrections and initial failures recorded. Staged/push/CI pending delivery verification.
