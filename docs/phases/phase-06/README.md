# Phase 6 — Claims and representative replies

Branch phase-06-claims depends on Phase5 final docs414c530. Private fictional evidence uses the existing validated private image pipeline. Approval/rejection/revocation requires an independently trusted admin and a reason; all decisions and claimed detail edits/replies are audited. Pending/revoked claims cannot mutate details or reply. One approved representative per target; visible tenant reviews by a claimant must be explicitly resolved before approval. Approval and review creation share locks and ownership is rechecked after locking.

Property representatives may update name/description/rent; managers name/description. No addresses, associations, roles, status, ratings or tenant content can be changed. Replies are separate records matched to a property or the tenancy’s stored historic manager. Revocation hides replies immediately. Private document owner/admin download rechecks current authorization, no signed links. All prototype evidence is fictional.

Commands: npm run check; npm run test:db; npm run test:integration; Chrome npm run test:e2e. [Cases](test-cases.md), [click-by-click checks](review-checklist.md). User manual checks are pending; no merge or deployment.

Local acceptance PASS: unit64, SQL106, API9, all60 browsers, lint/types/production build. Desktop/phone images inspected;22 browser assets contain no configured private values. Remote CI pending.
