# Phase 0 — Foundation

## Objectives and delivered features
Preserve and inspect the supplied repository, establish a readable tested application and document the complete product before adding backend workflows. Delivered: responsive public introduction, Jaipur SVG illustration, shared brand/styles, keyboard skip link, real section navigation, prototype/privacy/recommendation labels, strict TypeScript, Zod public environment validation, lint/unit/browser checks and branch CI. App entry points remain thin. Feature modules/schema are introduced when used rather than empty placeholders.

Repository inspected at `D:\projects\RentCheck`; origin `https://github.com/11gurnam/RentCheck.git`; clean `main` at `2f0a70a4dce87534579b5ffe772cbe0a8d5ee3c2`. Only initial README existed, no applicable AGENTS.md or unrelated changes. Phase branch starts from that commit.

## Prerequisites, configuration and data
Node 24 LTS/npm 11+, Git. `npm ci`, `npm run dev`, open http://localhost:3000. Public intro requires no environment values or database. `.env.example` names future `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; no secrets used. Supabase libraries installed and pinned for later phases; auth/DB/storage are not integrated yet. No migrations/seeds/data/reset or private documents in this phase. Browser tests are stateless and safe; clearing generated reports resets evidence. No production testing.

## Verification and manual reproduction
```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
```
Local browser download timed out; used preinstalled Chrome through `PLAYWRIGHT_CHANNEL=chrome`. PowerShell: `$env:PLAYWRIGHT_CHANNEL='chrome'`. CI uses bundled Chromium. No live Supabase/provider tests claimed.

Open the intro at widths 1440, 768 and 390. Check typography/content wrapping, hero illustration, navigation, section/footer spacing and absence of horizontal scrolling. Tab to Skip to content, Enter, then activate section links and the home link. Confirm prototype wording and tenant recommendation caveat. Automated [browser cases](../../../tests/browser/introduction.spec.ts) repeat these journeys; [unit cases](../../../src/lib/environment.test.ts) validate configuration success/invalid/boundary and excluding unknown privileged fields. Detailed [test record](test-cases.md).

## Actual verification (2026-10-05)
- Initial lint, strict types, 4 unit cases and production build PASS.
- Local production browser checks: 12/12 PASS (four cases at desktop/tablet/phone); no page errors, no horizontal overflow, no detected axe WCAG A/AA violations.
- Manually inspected all three full-page screenshots: PASS. [Desktop](evidence/desktop.png), [tablet](evidence/tablet.png), [phone](evidence/phone.png). Phone emulation is Chromium, not actual iOS Safari.
- Final `npm ci` and `npm run check`: PASS (lint, generated-route strict typecheck, 4 unit tests and production build). Clean install reported zero vulnerabilities.
- Latest completed `npm audit`: zero vulnerabilities. Earlier registry connection reset recovered on retry. The initial incompatible/unpatched lint dependency chain was removed; see architecture decision.

## Limitations and acceptance
Phase 0 covers the public introduction only. Accounts, search, listings, reviews, claims, moderation, document access and database policy integration remain unimplemented; their tests are NOT RUN and scheduled in the phase plan. No fake live integrations or placeholder controls. Accessibility automation is supplemented by visual/keyboard checks; physical devices/provider/Safari checks are outside this phase.

Acceptance: public page starts without credentials, responsive phone/tablet/desktop presentation, working navigation, scoped documentation, tests/checks/build and clean lockfile install. Implementation acceptance and push status tracked separately.

## Delivery record
- Branch: `phase-00-foundation` ([review](https://github.com/11gurnam/RentCheck/tree/phase-00-foundation)).
- Base: `2f0a70a4dce87534579b5ffe772cbe0a8d5ee3c2` (`main`).
- Final clean-install result: PASS.
- Tested implementation commit: `e8b50c6c0cb0cb02042585df923cfafa15c9bb2b`. Verified pushed commit: `c0229a0cf390179f3608177c5e8ce7c81d4e13a8`. A following documentation-only commit records the successful delivery; obtain the latest branch hash with `git rev-parse HEAD`.
- Implementation acceptance: PASS. Final lint/types/4 unit tests/build and 12 browser tests PASS. Final desktop screenshot hash matches the manually inspected evidence.
- Push status: PASS. Initial HTTP403 permission blocker resolved after the user's repository invite; retry succeeded on 2026-10-05. `git ls-remote --heads origin phase-00-foundation` matched the local pushed SHA `c0229a0cf390179f3608177c5e8ce7c81d4e13a8`.
- CI: PASS on that commit. [Verified GitHub Actions run](https://github.com/11gurnam/RentCheck/actions/runs/37277170506) completed successfully: clean install, lint/typecheck/unit/build, bundled Chromium installation, browser journeys and evidence upload. Subsequent documentation-only delivery commits also trigger branch CI; see [Actions](https://github.com/11gurnam/RentCheck/actions).
- Overall phase delivery: complete. No merge or deployment performed. Phase 1 remains unstarted.
- Stop here for review; Phase 1 has not started.
