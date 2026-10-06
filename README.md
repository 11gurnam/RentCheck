# RentCheck

India-wide accommodation research prototype: Google/email accounts and public aliases, multi-city discovery, private shortlists, fictional property contributions, canonical tenancies, separate property/management reviews and photos, private demonstration verification, women's recommendation counts, property/manager claims, representative replies, reports, trusted moderation, dated management history and conflict-safe property merges.

All eight phases are implemented on the final phase branch. Records/evidence and approvals remain demonstration examples. There are no bookings, payments or real ownership/tenancy certification.

## Start on a fresh local checkout

Use Node24 LTS, npm11+, Git and Docker Desktop with the Linux engine running. The complete version is on branch phase-08-release; main retains the earlier merged foundation until a separately authorized merge.

```sh
git switch phase-08-release
npm ci
npm run backend:start
npm run backend:env
npm run dev
```

Open http://127.0.0.1:3000. On Rudraksh's existing computer, the configured backend and Google provider are already present; do not reset it. A supplied production preview can be used directly without terminal commands.

backend:start applies versioned migrations to the dedicated local project rentcheck-accounts-test. backend:env writes ignored local/test configuration and provisions private JPEG buckets. Never run database reset on the existing user backend. These helpers refuse hosted test targets; unrelated Docker containers stay independent. Local email confirmations appear at http://127.0.0.1:54324.

.env.example lists the configuration. Public URL/publishable key identify the project. SUPABASE_SERVICE_ROLE_KEY is server-only for carefully authorized media upload/download registration; never prefix it NEXT_PUBLIC_. Account identity/admin/review mutations use the verified request-scoped client and database authorization. Real Google credentials remain private; provider setup is separate from fictional email test accounts.

## Checks

```sh
npm run check
npm run test:db
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run test:recovery
node scripts/check-browser-secrets.mjs
```

check runs lint, generated Next route types/strict TypeScript, unit tests and a production build. SQL cases roll back; live API/browser tests create and remove uniquely named fictional accounts/data on the loopback backend. Audit fixtures intentionally retain immutable history. test:recovery runs serially after the ordinary suite and temporarily denies exactly one local review RPC; finally restores its grants. Do not run it concurrently with other tests. CI runs clean npm install and the isolated backend, then these checks.

If Chrome is already installed on Windows, set $env:PLAYWRIGHT_CHANNEL='chrome' before browser commands. CI uses bundled Chromium. Phone tests emulate a viewport/touch; physical-device/Safari review is separate. Screenshots/traces are generated under ignored test-results/ and playwright-report/. Committed phase evidence uses synthetic profiles only.

## Review and hosting

- [Beginner review guide](docs/review-guide.md)
- [Final end-to-end checklist](docs/phases/phase-08/review-checklist.md)
- [Phase results and evidence](docs/phases.md)
- [Specification](docs/specification.md)
- [Implemented architecture](docs/architecture.md)
- [Deployment preparation](docs/deployment.md)
- [Google provider setup](docs/phases/phase-01/provider-setup.md)

Phases were tested and pushed sequentially under the user's continuation instruction. No main merge or public deployment was performed. The final branch contains all earlier phases.
