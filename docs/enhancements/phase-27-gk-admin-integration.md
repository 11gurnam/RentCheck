# Phase 27 — integrate GK's administration and verification changes

Merged `origin/phase-23-gemini-activation` at `a972fda` (Gurnam Kaur) into `phase-24-26-ui-address-and-landlord`. This includes the property verification workflow, verification management, and administration dashboard, filters, moderation and appeals.

Resolved three conflicts by retaining the property map alongside listing appeals and using the new evidence workflow with the custom file picker. The picker now supports multiple documents while preserving the evidence workflow's file-count, format and size validation.

The incoming migration identifiers collided with the existing profile cleanup and contribution location migrations. Existing identifiers remain unchanged; incoming verification/admin migrations now use `202610130004` through `202610130008`, in dependency order. Apply migrations before deploying the combined frontend. If a separate development database already applied GK's original identifiers, reconcile its migration ledger against the actual SQL before applying these renamed migrations; do not reset or blindly replay them.

Local database and browser regression checks remain pending because Docker Desktop fails during startup. This merge is not a hosted deployment or a statement that the full regression suite passed.
