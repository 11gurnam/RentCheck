# Phase 13 — free hosted deployment

The user authorized completing deployment requirements. Target: Netlify Free and Supabase Free with the existing Google Cloud project; no paid upgrade, main merge or local data reset. Work is on `phase-13-hosted-deployment`.

Prepared in code: Netlify Node 24 build configuration, guarded hosted configuration preflight, public operator/contact notice, 3 MiB upload/input/output allowance, private JPEG/PDF storage setup helper and a bounded daily production cleanup function. The Phase 12 association-mode wrapper now preserves the UUID result used for dated corrections; a migration and API assertion prevent regression.

## How to check

1. Local photo/document forms should say **3 MiB**. Smaller valid images/PDFs still upload; larger files are rejected.
2. `/privacy` shows the configured operator/contact, or clearly says the local demo has no published operator.
3. Once hosted, `/api/health` must show only `{"status":"ok"}`. Signed-out `/api/admin/health` must deny access.
4. Follow [the deployment guide](../deployment.md) for hosted Google login, email confirmation/recovery, private document denial, upload and administrator checks. Repeat the [demo walkthrough](demo-walkthrough.md) using new fictional hosted test accounts; local success is not hosted acceptance.
5. In Netlify, inspect **Functions → media-cleanup**, confirm its schedule, run it once and check the private operation queue. It must not run on branch/preview deploys or expose a callable public cleanup URL.

Provider account sign-in, operator contact and hosted resources have not yet been supplied. No hosted URL, migration application, Google callback, SMTP delivery, scheduled run or hosted backup/restore is claimed complete. Existing local Google configuration and fictional records remain separate from staging.

Local acceptance: 77 units, 247 SQL, 13 API, lint/types and production build passed. Full browser run: 95/96, with a post-deletion connection reset; all three affected journeys then passed serially. All three recovery and three real-intake/expiry checks passed. Hosted provider acceptance is pending access.
