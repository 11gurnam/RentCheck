# Phase7 — Moderation, history and property merges

Branch phase-07-moderation depends on Phase6 finaldocs266248e88de3f88182a9fc604e9be628f4103f53; Phase6 implementation Actions37425095217 passed all60. No merge/deploy.

Signed-in reports are private, idempotent per reporter/review, and leave visible reviews unchanged. Admin keep/remove requires10–2000-character reason and immutable audit. Keep never republishes removed/deleted content. Removal excludes ratings/recommendations/replies and fresh photo access through existing visibility gates.

Admin duplicate candidates may be kept distinct or inspected for a merge. Merge requires two published same-state/city properties, explicit source/target detail and active-history choices, selected losing review IDs, selected claim revocations, reason and browser confirmation. Any unresolved repeated/overlapping canonical tenancy or representative conflict aborts the whole transaction. Saves deduplicate onto target; remaining claims transfer; selected claims revoke with audit. Public source is archived/404. Every losing tenancy/review stays archived on source with removed visibility, evidence/replies/answers preserved. Active canonical tenancy uniqueness uses a generated nullable property key so multiple archived conflicting records remain without bypassing active uniqueness. Author cannot alter archived duplicate tenancies.

Historic tenancy manager/association snapshots are never rewritten, even when active management history is replaced or moved. Nonselected management history is archived inactive, API RLS hides it; the original association row/FK survives. Original source property details/contributor provenance and a complete before-merge private audit remain. Ownership guards preserve source declared/approved ownership on target so archiving/merging does not enable self-reviews.

A coarse database catalogue transaction lock serializes prototype catalogue/review/claim mutations, management maintenance and merges. Former implementations move into inaccessible private functions; only authorized wrappers are callable. This favors correctness at prototype scale; throughput tuning is a future production concern. Concurrent source review creation either commits before merge and transfers, or is refused after source archive. Relevant media registration still locks/rechecks visible review.

Admin management maintenance adds nonoverlapping periods or explicitly replaces a chosen association; exclusion constraint enforces overlap refusals. Claimed manager with visible tenant reviews on the proposed property requires conflict resolution first. Administrator fictional manager creation rejects exact normalized names; similar names require explicit acknowledgement after inspecting existing profiles.

Migration009 applies incrementally, preserves local Google identity and provider. [Cases](test-cases.md), [beginner walkthrough](review-checklist.md). User manual walkthrough NOT RUN. Prototype audit/doc/photo retention is intentional; no physical purge feature or production verification claimed.
Local acceptance PASS: lint/types/unit66/production build, SQL122, realAPI10, all63 browser cases.23 browser assets scanned with no configured private values. Desktop/phone images inspected. Push/CI pending.

Final SQL review added preservation of third-profile uncertainty: pending duplicate candidates transfer to the survivor rather than being silently dismissed. SQL122/API10 rerun PASS; browser63 previously PASS with unchanged screens.
