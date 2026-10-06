# Phase 2 — execution record

Date: 2026-10-06. Only the dedicated loopback Supabase project is changed; the user's Google account is preserved. SQL fixtures roll back. Chrome phone/tablet/desktop tests use a production build. Every count below is observed, not inferred.

| Case | Method | Inputs / expected | Actual | Status |
| --- | --- | --- | --- | --- |
| D02-01 URL/domain validation | Unit | Empty defaults, whitespace, bounds, inverted budget, invalid type, city-qualified locality and INR grouping | 10 discovery unit cases pass; full unit suite43 | PASS |
| D02-02 Database discovery/privacy | pgTAP | Multi-city synthetic records, manager resolution/history, hidden records, combined filters, literal wildcard, locality guard and direct write denial | 13 discovery SQL assertions pass; full SQL suite33 | PASS |
| D02-03 Management temporal constraint | pgTAP | Overlapping manager period must reject; old manager retained | Exclusion error23P01 and dated history assertions pass | PASS |
| D02-04 Account regression | Live API | Refresh/revocation/private identity/direct permissions | Existing5 API cases pass | PASS |
| D02-05 Browser discovery | Playwright ×3 | Combined filters, URL reload/reset, empty/invalid queries, qualified locality, history links and404 | 42/45 initial cases passed; three validation cases matched hidden framework announcer. Scoped selector fixed; all three pass in targeted6 rerun. All45 distinct cases now pass | PASS |
| D02-06 Accessibility/visual | Axe + manual ×3 | No overflow, detected WCAG A/AA issues; inspect search/property/manager screens | Axe and overflow assertions pass across all3 sizes; search/property/manager desktop/phone screenshots manually inspected, including readable phone viewport captures | PASS |
| D02-07 Quality/build | Commands | Lint, strict types, all units, production build | Final check PASS: lint, strict types, unit43, production build. SQL33/API5 pass; final lint after evidence/helper additions PASS | PASS |
| D02-08 Delivery/CI | Git + Actions | Staged secret scan, push branch, compare SHA, isolated CI | Pending | NOT RUN |

No manual user checklist response claimed yet. Reviews/ratings and women's recommendation counts are deliberately not invented. Actual Google UI cancellation is still a Phase1 manual limit; real Google login/logout and alias persistence were verified there.
