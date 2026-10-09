# Phase 14 — hosted provisioning

Status checked on 9 October 2026. Deployment work continues on `phase-14-hosted-provisioning`; no main merge is required or claimed.

## Completed

- Linked this checkout to **RentCheck Staging**, project reference `qbvuwjyamktzwimisvet`, on the free Supabase plan.
- Applied all 17 migrations after a successful dry run. `supabase migration list --linked` confirms every local migration has a matching remote version.
- Configured and read back both private buckets: `review-photos` permits JPEG; `rental-documents` permits JPEG/PDF. Both retain a 5 MiB storage ceiling; application inputs remain limited to 3 MiB.
- Saved hosted credentials in ignored `.env.hosted.local`, separate from local configuration. The approved public operator is **RentCheck Team**, with contact **rentchecksupport@gmail.com**.
- Authorized the Netlify CLI and created `rentcheck-india` on the Free plan, with automatic paid top-ups disabled. The intended origin is `https://rentcheck-india.netlify.app`; the application has not yet been published.
- An anonymous API check confirmed access to the seeded public catalogue and denial of the private schema. Anonymous storage listing returned no objects; both buckets were separately verified as private.

## Still pending

Netlify publishing, hosted Google callback configuration, automated email delivery, hosted acceptance tests, cleanup schedule verification, and hosted backup/restore acceptance remain incomplete. A public contact address does not configure SMTP. Real-data intake must remain disabled until the operational checks are accepted.

The first isolated Netlify build compiled the application but failed during adapter packaging because Next inferred the parent checkout as its root. Explicit application and tracing roots fixed that path error; the next build compiled successfully but encountered Windows symlink permissions during packaging. A separate Linux Docker build is in progress. Lint passed. Product branding no longer describes RentCheck as a hackathon or prototype; demonstration records must still remain distinguishable from real contributions.

## How to check

1. From `D:\projects\RentCheck`, run `npx supabase migration list --linked`. All 17 rows should have the same Local and Remote version.
2. Open **RentCheck Staging → Storage** in Supabase. Both bucket names above should show **Private**. Inspect their file-size and MIME restrictions.
3. After publishing, open `/privacy` at the hosted URL and check the public operator/contact. Do not use local success as evidence of hosted configuration.
4. Follow the [deployment checklist](../deployment.md) for hosted account, upload, access-control and recovery checks. A successful migration installation alone does not prove the hosted application works.

The hosted database's fictional seed catalogue is now hidden by the operator control in [Phase 15](phase-15-genuine-public-catalogue.md). Existing local accounts and Google settings have not been replaced with hosted credentials.
