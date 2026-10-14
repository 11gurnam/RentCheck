# Phase6 execution

| Case | Method | Expected | Actual |
| --- | --- | --- | --- |
| C6-01 Strict input/privilege injection | Unit | Reject role/status/rating/address keys and invalid rents/replies | PASS, unit64 total |
| C6-02 Pending/approved/revoked controls | Rolled-back SQL | Only approved own matching claims act; tenant edits/delete denied | PASS, SQL106 total |
| C6-03 Evidence/API/privacy/history | Real local API | Service-only registration, owner/admin access; wrong historic manager denied; revoke hides | PASS, API9 total |
| C6-04 Approval/create race | Concurrent real API | Exactly one can succeed, never approved owner plus tenant review | PASS |
| C6-05 Browser upload/approval/details/reply/revoke | Desktop/tablet/phone | Correct click journey and no tenant-content changes | PASS, all60 browser cases |
| C6-06 WCAG/overflow/screenshots | Browser plus visual | No detected A/AA violations or horizontal overflow | PASS, all60 browser cases |
| C6-07 Real user Google/alias/admin | User from Phase1 | Login works, alias stays, admin not granted | User confirmed previously; no new manual check claimed |

Initial browser run found unstable name-based claim locator after detail rename and photo locator that assumed no other tenant photos. Corrected to exact private evidence link/exact photo URL; only rerun results count. Type check also caught a test variable shadowing browser document and was corrected.
