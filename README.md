# RentCheck

A phased India-wide accommodation research prototype. Tenant experiences, separate property/landlord reputations and shortlists are planned. Phase 0 provides the public introduction; Phase 1 adds tested email/password and Google accounts on an isolated Supabase backend. Discovery and review writing are not yet available.

## Local setup
Prerequisites: Node.js 24 LTS, npm 11 or newer, Git. Clone this repository, then:

```sh
npm ci
npm run backend:start
npm run backend:env
npm run dev
```

Open http://127.0.0.1:3000. Docker Desktop must be running for local accounts; backend:start starts only this repository's isolated Supabase project and applies versioned accounts migrations. backend:env writes local configuration to ignored files, preserving an existing .env.local. The introduction still works without a backend. `.env.example` documents `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SITE_URL` and `GOOGLE_AUTH_ENABLED`. Google requires account-owned credentials entered privately; see provider setup. Never commit credentials or private documents. No privileged key is used by the application; an ephemeral local test key stays in ignored .env.test.local for the Node test harness only.

For a nontechnical review, start with [How to review RentCheck](docs/review-guide.md) and the [Phase 1 click-by-click checklist](docs/phases/phase-01/review-checklist.md). Local confirmation emails appear in the [test inbox](http://127.0.0.1:54324), not a real inbox.

## Verification
```sh
npm run check
npm run test:db
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, strict typecheck, Vitest and production build. Browser tests start the production server and run desktop/tablet/phone Chromium journeys plus automated accessibility checks. `npm run build` then `npm start` runs production locally. Screenshots/reports are ignored generated files in `test-results/` and `playwright-report/`. CI repeats clean checks on pushes and pull requests.

If Playwright's browser download is unavailable and Chrome is already installed, use `$env:PLAYWRIGHT_CHANNEL='chrome'` in PowerShell before `npm run test:e2e` (or `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` on Unix). This is the Phase 0 local verification configuration. CI uses bundled Chromium. Phone tests emulate a phone viewport/touch in Chromium; they do not validate Safari or a physical device.

## Documentation
- [Specification](docs/specification.md)
- [Architecture and planned data/security model](docs/architecture.md)
- [Phases and delivery rules](docs/phases.md)
- [Phase 0 README and evidence](docs/phases/phase-00/README.md)
- [Phase 0 test cases](docs/phases/phase-00/test-cases.md)
- [Phase 1 README](docs/phases/phase-01/README.md)
- [Phase 1 test cases](docs/phases/phase-01/test-cases.md)
- [Google provider setup](docs/phases/phase-01/provider-setup.md)

Each later phase stops for review. No deployment is configured or performed.
