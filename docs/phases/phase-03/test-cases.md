# Phase 3 — execution record

2026-10-06; isolated local backend, synthetic fixtures; no user account reset. Recorded results only.

| Case | Method | Steps / expected | Actual | Status |
| --- | --- | --- | --- | --- |
| C03-01 Validation/auth returns | Unit + browser | Synthetic acknowledgement, field bounds/types/markup/rent ranges, injected privileges; known protected paths | Contribution7 and auth-return3 new cases pass; totalunit53. Browser sign-in gates pass | PASS |
| C03-02 Private saves | SQL | Anonymous denied, repeated save1 row, other-account read/remove cannot affect first, direct private table denied | 13 contribution SQL assertions pass; total46 | PASS |
| C03-03 Duplicate boundary | SQL | Exact normalized address denied even acknowledged; fuzzy same-city candidates allowed; different-city target excluded | Pass. Initial expectation of zero Jaipur candidates corrected: similar Jaipur addresses are legitimate, New Delhi target is excluded | PASS |
| C03-04 Concurrency/direct mutation | Real Supabase API | Six concurrent saves1 row; two same-address creations exactly1 succeeds; arbitrary direct update denied | Integration casePASS; full API suite6 | PASS |
| C03-05 Browser journeys | Playwright ×3 | Sign-in gates, save/reload/remove, retained duplicate form inputs, existing-profile links, distinct creation and search/profile | Full51 browser casesPASS. Visual review caught native checkbox reset; prevented reset, added assertion and affected3 journeys rerunPASS | PASS |
| C03-06 Accessibility/visual | Axe + screenshots | Add/duplicate/shortlist phone/desktop, no overflow/violations | Add form axe/overflowPASS all3 sizes. Desktop/phone shortlist, duplicate and add screenshots inspected; corrected checkbox capture reinspected | PASS |
| C03-07 Quality/regressions | Commands | Lint/types/unit/build, all previous DB/API/browser cases | Final npmcheckPASS lint/types/unit53/build. SQL46/API6PASS. All51 browser cases plus final targeted3PASS. Initial type inference error fixed before passing checks | PASS |
| C03-08 Delivery | Git/Actions | Staged secret scan, push/remote SHA, isolated CI | Pending | NOT RUN |

User manual review not yet reported. No fake management grants, cross-account save visibility, automatic uncertain merges or anonymous mutation paths claimed.
