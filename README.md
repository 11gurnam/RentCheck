# RentCheck

India-wide accommodation research: Google/email accounts and public aliases, multi-city discovery, private shortlists, canonical tenancies, separate property/management reviews and photos, private evidence review, women's recommendation counts, property/manager claims, representative replies, reports, trusted moderation, dated management history and conflict-safe property merges.

The hosted site is https://rentcheck-india.netlify.app. Google sign-in and SMTP were configured in earlier hosted phases. The current release work is [Phase 22](docs/enhancements/phase-22-tested-ui-deployment.md): searchable comparison, profile photos, criterion ratings and five-photo review uploads. Photos include tenant/landlord provenance; accounts support recovery, private PDFs, notifications and deletion. Opt-in private messaging, reporting/blocking and explicitly recorded maps are available. Hosted examples remain labelled and real-data intake remains closed. There are no bookings, payments or independent ownership/tenancy certification.

## Start on a fresh local checkout

Use Node24 LTS, npm11+, Git and Docker Desktop with the Linux engine running. The latest release branch is phase-23-gemini-activation; main retains the earlier merged foundation until a separately authorized merge.

```sh
git switch phase-23-gemini-activation
npm ci
npm run backend:start
npm run backend:env
npm run dev
```

Open http://127.0.0.1:3000. On Rudraksh's existing computer, the configured backend and Google provider are already present; do not reset it. A supplied production preview can be used directly without terminal commands.

backend:start applies versioned migrations to the dedicated local project rentcheck-accounts-test. backend:env writes ignored local/test configuration and provisions private photo and JPEG/PDF evidence buckets. Never run database reset on the existing user backend. These helpers refuse hosted test targets; unrelated Docker containers stay independent. Local email confirmations and password recovery messages appear at http://127.0.0.1:54324.

.env.example lists the configuration. Public URL/publishable key identify the project. SUPABASE_SERVICE_ROLE_KEY is server-only for carefully authorized media upload/download registration; never prefix it NEXT_PUBLIC_. Account identity/admin/review mutations use the verified request-scoped client and database authorization. Real Google credentials remain private; provider setup is separate from fictional email test accounts.

## Checks

```sh
npm run check
npm run test:db
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run test:recovery
npm run test:operations
npm run ops:backup-check
node scripts/check-browser-secrets.mjs
```

check runs lint, generated Next route types/strict TypeScript, unit tests and a production build. SQL cases roll back; live API/browser tests create and remove uniquely named fictional accounts/data on the loopback backend. Run SQL, integration and browser suites sequentially because their fixtures share this database. Audit fixtures intentionally retain immutable history. test:recovery runs serially after the ordinary suite and temporarily denies exactly one local review RPC; finally restores its grants. Do not run it concurrently with other tests. CI runs clean npm install and the isolated backend, then these checks.

If Chrome is already installed on Windows, set $env:PLAYWRIGHT_CHANNEL='chrome' before browser commands. CI uses bundled Chromium. Phone tests emulate a viewport/touch; physical-device/Safari review is separate. Screenshots/traces are generated under ignored test-results/ and playwright-report/. Committed phase evidence uses synthetic profiles only.

## Review and hosting

- [Phase 22 release and beginner checks](docs/enhancements/phase-22-tested-ui-deployment.md)
- [Phase 23 Gemini activation and checks](docs/enhancements/phase-23-gemini-activation.md)
- [Beginner review guide](docs/review-guide.md)
- [Current tenant and landlord demo walkthrough](docs/enhancements/demo-walkthrough.md)
- [Phase 10 account/privacy checking guide](docs/enhancements/phase-10-account-privacy.md)
- [Phase 11 messaging/comparison/maps checking guide](docs/enhancements/phase-11-messaging-discovery.md)
- [Phase 12 real-data/operations checking guide](docs/enhancements/phase-13-hosted-deployment.md)
- [Operator commands and retention/backup policies](docs/operations.md)
- [Final end-to-end checklist](docs/phases/phase-08/review-checklist.md)
- [Phase results and evidence](docs/phases.md)
- [Specification](docs/specification.md)
- [Implemented architecture](docs/architecture.md)
- [Deployment preparation](docs/deployment.md)
- [Google provider setup](docs/phases/phase-01/provider-setup.md)

Phase branches contain the prior work and teammate updates. This release does not merge main. Git pushes do not automatically deploy the site: production publication currently uses a checked Linux Netlify build and manual CLI deployment. Database migrations are applied separately to RentCheck Staging.

Hosted preparation and beginner checks: [Phase 13](docs/enhancements/phase-13-hosted-deployment.md) and [deployment guide](docs/deployment.md). New photo/document uploads are limited to 3 MiB to fit free-host request limits.
