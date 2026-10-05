# RentCheck

A phased Jaipur accommodation research prototype. Tenant experiences, separate property/landlord reputations and shortlists are planned. Phase 0 provides the public introduction and tested project foundation; accounts and discovery are not yet available.

## Local setup
Prerequisites: Node.js 24 LTS, npm 11 or newer, Git. Clone this repository, then:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Phase 0 requires no credentials. `.env.example` documents `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Phase 1; copy to `.env.local` when configuring a test Supabase project. Never commit credentials or private documents. No database migrations/seeds/reset exist yet. No privileged key is used in Phase 0.

## Verification
```sh
npm run check
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

Each later phase stops for review. No deployment is configured or performed.
