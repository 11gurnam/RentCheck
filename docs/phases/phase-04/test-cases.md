# Phase 4 execution record
2026-10-06, isolated loopback Supabase, synthetic users only. Existing Google account/volume preserved.

| Case | Method | Expected | Actual/status |
|---|---|---|---|
| R04-01 | Unit | Real calendar dates/rent/rating bounds, optional explicit answers, synthetic acknowledgement | PASS, total55 unit checks |
| R04-02 | Unit Sharp | Disguised/SVG rejected, resizing and metadata stripping | PASS |
| R04-03 | pgTAP | Anonymous denied, own dashboard, historic snapshot, private answers/tenancy IDs denied, no direct update, raw uniqueness/date constraints, delete excluded from feed/scores | PASS, total65 SQL checks |
| R04-04 | Real API | Four concurrent submissions1created/3existing, changed-start overlap flagged, other author denied, immutable start, deleted tombstone, storage bypass denied, own-property review denied, concurrent photo registration capped3 and other-author removal denied | PASS, total7 API cases |
| R04-05 | Browser x3 | Author create/edit/photo rejection/validupload/delete, public privacy and immediate deleted-photo404 | PASS all54 browser cases after corrections, including prior regressions |
| R04-06 | Quality | Lint/types/unit/build | PASS final lint/types/unit55/build. Initial client-array type inference corrected |
| R04-07 | Privacy | Privileged key absent from browser assets | PASS,20 browser assets scanned |
| R04-08 | Visual | Phone/desktop form/feed screenshots and axe/nooverflow | PASS desktop/phone form/feed final captures inspected; axe and no-overflow all3 sizes |
| R04-09 | Delivery | Staged secret scan, pushSHA/CI | PASS52files;6a02bf4 remoteverified; Actions37420907217 success including all54 cases |

Initial photo migration attempted to provision bucket before disabled storage schema existed; transaction rolled back. Corrected to API provisioning after storage startup, incremental migrations passed. No database reset.


Initial browser regression run48/54: three obsolete placeholder-heading expectations and three select-label timeouts. Corrected locators/heading. Scoped rerun passed account3; review3 reached successful deletion but expected unmounted form status. Corrected assertion to persisted dashboard deleted state. Production start attempted while a build was unfinished; waited for successful build before rerun. These failures are not counted as passes.
