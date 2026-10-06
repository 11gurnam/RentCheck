# Phase delivery plan

Each phase reads the canonical docs, inspects Git state/prior merge, implements only its scope, records tests, runs relevant prior regression checks and lint/types/tests/build, visually reviews phone/desktop, inspects staged diff/secrets, commits and pushes a phase branch. Verify remote commit and report implementation, push and a beginner checklist separately. On 2026-10-06 the user authorized continuing Phases 2–8 sequentially without stopping for routine review; pause only for required user input or a real blocker. Never merge main, force-push, deploy, delete remotes or change visibility without explicit authorization. Split oversized phases into complete documented subphases before implementation.

| Phase | Branch | Scope and exit criteria |
| --- | --- | --- |
| 0 | phase-00-foundation | Preserve initial repo; canonical docs/model; introduction/styles/structure; lint/types/unit/browser/CI; setup docs; responsive intro starts and checks pass |
| 1 | phase-01-accounts | Email/password + Google, logout, aliases, protected access/admin permissions; real sessions/private identity/provider checks |
| 2 | phase-02-discovery | Versioned schema/seed, search/basic URL filters, property/landlord profiles; correct dated associations and combined filters |
| 3 | phase-03-contributions | Per-user persistent saves/add property/duplicate candidates; persistence and authorization |
| 4 | phase-04-reviews | Tenancies/create/edit/delete, separate ratings/photos/dashboard; one-per-tenancy concurrency, ownership/self-review, averages/history |
| 5 | phase-05-verification | Private demo documents/admin approvals/women's counts/filter; threshold/recalculation/direct access checks |
| 6 | phase-06-claims | Claims/admin decisions/dashboard/detail updates/replies; approved permissions, no tenant review edits |
| 7 | phase-07-moderation | Reports/decisions/audit/history/merges; pending visibility, historical attribution, atomic conflict resolution |
| 8 | phase-08-release | All role journeys/security/accessibility/responsiveness/errors, acceptance and deploy instructions; deployable build without deploying |

If prior phase unmerged, branch from its verified final commit and document dependency. Every phase includes `docs/phases/phase-XX/README.md`, `test-cases.md` and a plain-language `review-checklist.md`: objectives, prerequisites/env without secrets, migrations/seed/reset, commands/manual checks, evidence, limitations/acceptance, branch/commit/push URL. The user checklist supplies exact pages/clicks, example inputs, expected results, readiness/blockers and how to report issues without technical knowledge. Case IDs/names, automated/manual, prerequisites/data, inputs/steps, expected/actual, PASS/FAIL/BLOCKED/NOT RUN. Never mark unexecuted checks PASS.

Current boundary: Phases0–4 complete, tested and pushed as dependent phase branches; main remains at merged Phase0. India-wide scope replaces Jaipur-only scope. Phase3 CI37418515790 passed; sequential continuation is authorized through Phase8. Phase4 Actions37420907217 passed all54 browser cases. Phase5 private verification/women’s recommendations is next. No merge/deployment. [Latest contribution evidence](phases/phase-03/README.md), [user review guide](review-guide.md), [remaining-work tracker](remaining-work.md).
