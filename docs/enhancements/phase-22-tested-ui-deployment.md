# Phase 22 — tested UI deployment

This release pulls teammate commits `413cd6a` and `49c255b`, merged as `f353ffa` on `phase-21-hosted-demo-catalogue`, into `phase-22-tested-ui-deployment`. It also includes the earlier incoming profile, criteria and half-star changes that had not reached the hosted application.

## Changes

- Comparison uses a searchable picker, up to three places, and a side-by-side table.
- Reviews support accommodation-specific half-star criteria, custom criteria, compact rating breakdowns and expandable descriptions.
- A review can select up to five photos before publication. Photos upload one at a time; a rejected/interrupted upload leaves the remaining selection for retry without creating a second review. Tenant attachments open in a viewer and appear in the tenant gallery. Landlord media remains in the property gallery with source and claim labels.
- Account controls include profile photos, signed-in header identity, alias editing and a password-change modal requiring the current password.
- Review language checks fall back to the basic local checker when Gemini is unconfigured. No Gemini credential or paid service was created for this release. Optional multilingual AI is not enabled on the hosted site.
- Deployment corrections retain the current selected-photo snapshot through confirmation, avoid shifting controls when a language check starts, label unverified tenant photos explicitly, and include profile photos in account-deletion cleanup, private storage verification, backups and secret scans.

## Database and data

Nine migrations were applied to RentCheck Staging on 13 October 2026: `202610120001`–`202610120007`, `202610130001`, and `202610130002`. They add public avatar URLs, private profile-photo storage, criterion ratings/summaries, the combined gallery, five-photo registration and account-avatar cleanup. All 27 versioned migrations are now applied. Existing user records were preserved. No database reset or hosted test fixtures were used.

An encrypted pre-migration export was restored to an isolated scratch database: 66 table counts matched, permissions and demo visibility survived, and the scratch resources were removed. There were no hosted media objects to restore. The operator key and exports remain ignored local files; this does not establish automated offsite backups.

The eight labelled city examples remain available. Real-data intake remains closed. No application administrator was granted by this release.

## Validation and deployment

Published on 13 October 2026 at **https://rentcheck-india.netlify.app**, Netlify deploy **`6acdd61c92bceede60cedd24`**. Publication used the production Linux Netlify build and `.netlify/static` with generated SSR, edge and cleanup functions. The 159 application/build source files exactly matched the build mirror.

- Lint, strict TypeScript/route generation and production builds passed.
- 87 unit tests, 256 transactional SQL checks and 15 integration tests passed. Run database, integration and browser suites sequentially; a concurrent attempt exposed a shared-fixture collision, and the isolated SQL rerun passed.
- All 105 browser tests passed across desktop, tablet and emulated phone, including comparison, account photo/password/recovery, review criteria, five-photo selection/rejection/retry, landlord provenance/claims/revocation, private documents, deletion, messaging and moderation. Detected accessibility and overflow checks passed within those journeys. Physical phones/Safari remain separate acceptance.
- Both browser asset scans passed: 37 assets contained no configured private values.
- Hosted schema checks confirmed closed real intake, eight published properties, three private buckets, denied avatar storage paths, denied private-schema access, public gallery access and service-only photo registration.
- `node scripts/hosted-release-check.mjs` passed 11 live HTTP checks plus public database/RPC and bucket checks. Google still hands off to accounts.google.com with the exact hosted Supabase callback; the live sign-in page offers Google. This checks provider configuration, not a new owner-interactive Google login.
- The live browser displayed the new Jaipur/Mumbai comparison and matching database-backed facts. Release screenshots remain ignored under `work/deployment-proof/phase22-live-comparison*.png`.

The local production preview was restarted at http://127.0.0.1:3000 after browser tests. Existing local credentials/backend settings were preserved. No paid upgrade, main merge, new administrator grant or OAuth account transfer was performed.

## How to check

1. Open https://rentcheck-india.netlify.app/search, open **Filters**, select Jaipur, and click **Apply filters**. Open the property and its manager history.
2. Open **Compare** at `/compare`. Click **Add a place**, search a city, and add two or three places. Check rent, location and ratings side by side. Remove a place and try **Clear selection**.
3. Sign in, open **Your account**, upload a profile photo and save your public alias. Refresh to check persistence. A normal member must still receive restricted administrator access.
4. Open a labelled demo property and choose **Write a review**. Enter tenancy dates/rent, rate every required category, optionally add a custom criterion, and write a respectful comment. Select photos, remove one, and confirm the comment before publication. Use invented details for these demo records.
5. Open **Your reviews**, edit that review, and check that dates, ratings and photos remain. Photos are limited to five per review and 3 MiB each. Open the property, use the review photo viewer and inspect tenant source/verification labels. Delete your test review when finished.
6. For landlord uploads, open a property you declared ownership of or have an active matching claim for. Expand **Add or manage landlord photos**. Uploaded photos show their uploader and claim status; evidence review is not independent identity certification.

## Future teammate pushes

Push source to `https://github.com/11gurnam/RentCheck` and identify the branch to deploy. A Git push does not publish this manually deployed Netlify site. Pull/review/test the source, back up and apply pending hosted migrations, build with Node 24 on Linux using the Netlify adapter, scan public assets, and publish `.netlify/static` with its generated functions. Never upload `.next` directly.

Provider OAuth/SMTP credentials remain private settings, separate from Git. Refer to earlier operations records for remaining real-user launch requirements, including administrator designation, hosted workflow acceptance, scheduled-cleanup evidence and offsite backup operations.
