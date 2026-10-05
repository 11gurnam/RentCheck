# Phase 1 — Accounts

## Objectives and scope
Email/password + Google authentication, logout, aliases, protected review access and independently controlled administrator permissions. Also incorporates the user's India-wide scope correction and beginner review instructions. Phase 0 was merged by the user; phase-01-accounts starts at merged origin/main `26c886319853eacc4e1142b8a3376b34cc6479ee`. No unrelated edits were present. No later property/review/claim/moderation workflow implemented.

Delivered locally: responsive sign-in/register/private account screens; confirmation email + single-use token handling; alias editing; session persistence/refresh/current-session logout; protected page/API boundaries; restricted administrator grants; Google PKCE integration with setup gating; private identity/public alias schema, transactional account bootstrap and direct API/database permissions. Review/admin pages show honest phase boundaries. Only account details/aliases can currently be changed.

## Your review (no code knowledge needed)
Use the [click-by-click checklist](review-checklist.md). Open [the website](http://127.0.0.1:3000) when the preview is running. Demo confirmation emails go to [the local inbox](http://127.0.0.1:54324). Google needs the [account-owned setup steps](provider-setup.md); do not mark that check passed before an actual Google sign-in.

## Prerequisites and environment
Node 24/npm 11+, Docker Desktop with Linux engine running. Existing pinned application packages retained; added pinned Supabase CLI 2.119.0 and server-only 0.0.1. New dependencies reported zero vulnerabilities. Application needs only NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SITE_URL and GOOGLE_AUTH_ENABLED. Never put secret/service-role keys in NEXT_PUBLIC variables. Secrets/confirmation tokens are not review evidence.

```sh
npm ci
npm run backend:start
npm run backend:env
npm run dev
```

backend:start applies `supabase/migrations/202610050001_accounts.sql` and empty rental seed to the dedicated `rentcheck-accounts-test` project. backend:env captures local status in memory and writes ignored `.env.local` (only if absent) and `.env.test.local`. The latter contains SUPABASE_TEST_URL/PUBLISHABLE_KEY/SERVICE_ROLE_KEY solely for the Node test harness. Application never reads its secret key. The tests refuse non-loopback targets and port other than 54321. Existing .env.local is preserved; use only a matching local app/test backend for live browser journeys.

## Data, reset and administrator setup
No properties, reviews or documents yet. Unit input and integration users are synthetic `@example.test` identities. Live tests create unique users and delete only those fixture users; SQL pgTAP wraps its data/grants in a rolled-back transaction. No default admin account/credentials seeded. Private account mappings/grants are outside the exposed schema; public profile UUID differs from private auth UUID.

For an intentional reset of ONLY this disposable local project, with no reviewer data to preserve: `npx supabase db reset --local` from this repository. This clears local test users/data and reapplies migrations; never use --linked/remote resets. Do not reset after the user starts reviewing or configuring their Google account unless they request it. `npx supabase stop` preserves local volumes for later restart. Other Docker projects are untouched.

Administrator grants are inserted/revoked by a trusted database operator in private.administrator_grants, with a reason; never via application user metadata or an editable role field. Tests exercise this with temporary synthetic grants through the isolated database only. No public grant function exists.

## Automated verification
```sh
npm run check
npm run test:db
npm run test:integration
npx playwright install chromium
npm run test:e2e
```
For installed Chrome fallback in PowerShell: `$env:PLAYWRIGHT_CHANNEL='chrome'` before browser tests. Browser runner owns the production server; stop a running preview first to prevent testing an outdated server. CI now starts isolated Supabase, applies schema and runs database/auth integration before quality/build and browser checks. No live Google secret needed by CI; Google provider must also be checked manually by its owner.

Links: [unit validation](../../../src/features/accounts/validation.test.ts), [environment guards](../../../src/lib/environment.test.ts), [database role cases](../../../supabase/tests/accounts.test.sql), [live API/session tests](../../../tests/integration/accounts.test.ts), [browser journeys](../../../tests/browser/accounts.spec.ts), [test record](test-cases.md).

## Actual verification (2026-10-05)
- Lint/strict route types/unit/production build: PASS. Unit tests: 33/33.
- Real local SQL permission tests: 20/20 PASS.
- Real local Supabase API/session tests: 5/5 PASS, including refresh and logout revocation.
- Production browser run: 33/33 PASS across desktop/tablet/phone; no skipped cases. Includes existing introduction regression and new account journeys, confirmation + replay denial, fake cookie denial, persistent aliases, anonymous API denial, trusted administrator grant and immediate revocation.
- Final skip-link CSS correction: production build and 12 relevant browser regressions (validation, keyboard navigation, responsive accessibility and introduction screenshots) pass across all three sizes. The shortcut stays available to keyboard users without covering pointer-submitted form headings.
- Account accessibility scan: zero detected WCAG A/AA violations on sign-in/register. Manual visual review of desktop/phone sign-in/register/account: PASS; final visual evidence recorded after the final copy adjustment. Intro/tablet/admin visual checks are recorded in the test cases.
- Initial browser failures came from ambiguous alert selectors matching the framework's route announcer and confirmation replay racing logout. Scoped user-facing selectors and explicit logout completion assertions fixed the tests; all relevant cases were rerun. No false pass claimed for that earlier run.
- Google credential helper: PASS; dedicated local backend restarted with provider enabled. HTTP redirect check reaches accounts.google.com with the expected local Supabase callback. Credentials remain in ignored local configuration.
- After enabling Google: quality/build/unit33, live API5 and full browser33 rerun PASS. Enabled Google button screens inspected at desktop/phone; secret values absent from public static bundles.
- User confirmed real Google sign-in and persistent alias after saving/refresh on 2026-10-05, and observed administrator access Not granted. Private-safe database assertions confirm one Google account, separate public UUID, alias distinct from email/Google name, no administrator grant, three login events and one logout. No private identity or session tokens recorded as evidence.
- `node scripts/verify-google-provider.mjs`: PASS for provider handoff and simulated access_denied with real local authorization state. Supabase returns to the app; the app shows a useful sign-in error without issuing a session cookie. Actual cancellation in Google's UI was not manually checked; the simulated provider denial is recorded separately from the real login.

## Acceptance and delivery status
Implementation acceptance: PASS. Email/password, real Google sign-in/logout, persistent aliases, public/private identity boundaries, protected access and trusted administrator permissions are verified. User Google review and local automated/visual checks pass. Remote delivery verification is recorded separately below; Phase 2 has not started.

- Branch: `phase-01-accounts`, based on merged Phase 0.
- Commit/push status: prepared for commit/push after implementation acceptance. Final delivery record follows remote verification.
- Branch URL: https://github.com/11gurnam/RentCheck/tree/phase-01-accounts.
- CI workflow starts isolated Supabase, then database/API/quality/build/browser checks; remote result pending push.
- No merge, deployment, visibility change or production test performed.

## Limits
The local test inbox proves the confirmation flow, not real-world SMTP delivery. Phone is Chromium emulation, not physical iOS Safari. Actual Google sign-in cannot be replaced by mocks or local Auth success. Password recovery, other-device logout and account deletion UI are outside this phase. Documents/storage policies arrive in Phase 5; storage is disabled locally for this phase. Claims/moderation roles arrive later, using this independent account/admin foundation.
