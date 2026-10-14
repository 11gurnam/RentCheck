# Phase 12 — real-data preparation and operations

This phase adds database-controlled real intake, per-record demo labels, explicit submission permission, redacted private evidence, manual-review checklists, evidence expiry, cleanup retries, readiness endpoints and an encrypted local backup/restore drill. The current demo remains in fictional mode; public deployment is deferred.

## How to check without terminal experience

1. Open the app and **Your account → Evidence retention policy**. It should describe the current intake mode, public/private information, evidence deadline, deletion and backup behavior.
2. Open an existing demo property. It should still say **Synthetic example**, and old approvals should still say demonstration. Changing the operation setting must never make those examples look genuine.
3. Use the separate trusted administrator account and open **Administrator area → Operations and cleanup**. It should show fictional intake, retention days, pending cleanup count and oldest-job time. An ordinary account must remain restricted.
4. Open `http://127.0.0.1:3000/api/health`. A running healthy local system should show `{"status":"ok"}`. Opening `/api/admin/health` while signed out should show sign-in required, and an ordinary signed-in account should show administrator access required.
5. Real workflows were tested using invented disposable fixtures: a real-mode property/review has a different label; a real-evidence approval fails until all three checks are recorded; a fictional property keeps its original label; expired evidence returns 404 and cleanup physically removes its file. To repeat manually, follow [the operator guide](../operations.md), explicitly enable local real intake, and use only invented disposable data during your demo. Return to demo mode afterward.
6. Only an operator should run the backup and cleanup commands. The backup drill prints a pass/fail result; it restores into temporary resources, never your live database. Do not share the backup files, key or private environment configuration.

## Boundaries

Manual evidence review is not independent identity/ownership certification or a safety guarantee. Uploaded PDFs are validated and rewritten but are not antivirus-scanned. Maps use supplied coordinates and a third-party provider. Messaging updates on refresh. Scheduling for cleanup, backup rotation and external alerts must be configured when hosting is chosen. Hosted authentication/callbacks, provider-specific backups and recovery cutover have not been tested. Those operational setup items remain part of deployment, which the user deferred.

Final validation and commits are recorded in [the enhancement plan](plan.md).
