# Phase7 execution

| Case | Method | Expected / actual |
| --- | --- | --- |
| M7-01 Reports / permissions / pending visibility | SQL + real API | PASS; anon/ordinary admin access denied, pending visible, reasoned keep/remove |
| M7-02 Canonical repeated/overlap merge | SQL + real API | PASS; no resolution refuses, explicit losing record archives; winner unchanged |
| M7-03 Atomic claims/saves/ownership | Real API | PASS; same-account active claim collision rolls back, explicit revoke succeeds, saves deduplicate, source ownership persists |
| M7-04 Historical attribution / exclusions | SQL + real API | PASS; overlap SQL23P01, explicit replacement retains historic manager rating; removed feed/rating excluded |
| M7-05 Merge/create concurrency | Concurrent real API | PASS; no visible review remains on archived source |
| M7-06 Archive/privacy/audit | SQL + API | PASS; private audit/report direct access denied; archived tenancy changes refused; immutable history retained |
| M7-07 Manager creation | Real API | PASS; trusted creation, ordinary denial, exact duplicate refusal |
| M7-08 Validation/build | Unit + lint/types/build | PASS unit66; SQL122 and API10 total |
| M7-09 Browser/axe/overflow/visual | Three sizes + inspection | PASS all63 cases, axe/overflow and inspected desktop/phone images |
| M7-10 User walkthrough | Manual user | NOT RUN |

Initial SQL run found ambiguous resolution ID aliases and unqualified constraint lookup under empty search_path. Both corrected before rerun: all122 SQL cases PASS. API confirms complete rollback of refused merges. No mocks counted as live backend checks.
