# Phase 5 execution record
2026-10-06; isolated backend; synthetic users/documents, no real account reset.

| Case | Method | Expected | Actual/status |
|---|---|---|---|
| V05-01 | Unit | Below3/exact3/tie/strict majority, consistent UI calculation | PASS total62 unit checks |
| V05-02 | pgTAP | Anonymous/otherowner documents denied, self approval denied, trusted approvals, unanswered/nonwoman/unverified/deleted exclusion, answer edits/removal/revocation recalculate, immutable audit/admin revocation | PASS total87 SQL checks, including robust prior review baseline |
| V05-03 | Real API | Real private JPEG upload/registration, only owner/admin authorization, direct storage/registration denied, admin revoke loses access, public feed has no document identifier | PASS total8 API cases |
| V05-04 | Browser x3 | Three private uploads, ownerdownload/anonymous401, admin approvals3/3, labelled verified reviews, filter and revocation, no private paths, revokedadmin404 | PASS scoped3 and full57 browser regressions |
| V05-05 | Quality | Lint/types/unit/build | PASS; final helper change lintPASS |
| V05-06 | Accessibility/visual | Verification/admin/profile axe and desktop/phone screenshots | PASS axe3sizes and desktop/phone final screenshots inspected |
| V05-07 | Local user setup | Separate fictional demo accounts and sample document | PASS helper executed and image inspected; Google user privilege unchanged |
| V05-08 | Secrets/delivery | Bundle/staged key/password exclusion, pushSHA/CI | PASS21assets/37stagedfiles; c3418c6 remoteverified; Actions37422880430 success all57 |

Initial desktop browser assertion expected an extra space in1/1; UI count was correct. Corrected assertion, scoped3 passed. No failed checks counted as passes. SQL fixture document metadata is inserted transactionally for threshold rules; live API/browser cases separately prove storage upload and authorization. Audit retains synthetic fixture records intentionally. User manual walkthrough pending.
