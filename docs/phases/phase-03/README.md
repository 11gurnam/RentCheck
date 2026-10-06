# Phase 3 — Shortlists and contributions

Base: unmerged Phase2 final documentation commit2712ee43debd45e7a6f9e3d73a94a85eee7e68af. Phase2 implementation CI37417028532 PASS. Branchphase-03-contributions depends on phase-02-discovery. Sequential continuation authorized; no merge/deployment.

Adds account-private persistent saves and synthetic property contribution. SQL RPCs derive identity from auth.uid; no user ID is submitted by the client. Saves are idempotent and removed only for their owner. Private provenance records contributions and voluntary ownership declarations without exposing identities or granting claimant privileges. Deleting a test auth user cleans its saves; contributed public profiles remain with anonymized provenance unless a trusted fixture cleanup removes that specific property.

Migration202610060002_contributions.sql introduces private saves/provenance/duplicate queues. Exact normalized state+city+address uniqueness is enforced by a database index and transaction-scoped lock, including concurrent submissions. Fuzzy same-city name/address candidates require acknowledgement, then queue explicit administrator review. Exact duplicates cannot be overridden. Hidden addresses stay protected and cannot be duplicated; generic failure avoids revealing hidden profiles.

Apply incremental local migrations with `node node_modules/supabase/dist/supabase.js migration up --local`; no reset. Direct client writes and private-table reads remain denied. Rent/bounds/type/markup/synthetic acknowledgement validated server-side; database constraints apply independently. [Review checklist](review-checklist.md), [execution record](test-cases.md).

Technical checks: npmruncheck, test:db, test:integration and production Chrome browsers. Integration fixtures create unique synthetic users/properties and delete only their own fixture IDs. Existing Google account persists. Discovery browser assertions use known profiles/filter behavior rather than assuming there can never be additional valid contributed properties.

Implementation acceptancePASS: lint/types/unit53/build, SQL46, live API6, full browser51 and final affected3 browser rerun after checkbox preservation fix. Desktop/phone shortlist/add/duplicate screens inspected, axe/overflow checks pass across3 sizes. [Evidence](evidence/) and detailed record include initial test/type failures and their verified corrections. User manual review not yet reported; checklist supplied while continuing automatically.

Delivery pending staged scan/commit/push/CI; https://github.com/11gurnam/RentCheck/tree/phase-03-contributions. No reviews/claims/moderation UI in this phase. Next Phase4: canonical tenancies, separate property/manager reviews and photos.
