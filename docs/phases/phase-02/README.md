# Phase 2 — India-wide discovery

Scope: public accommodation search, URL-backed combined state/city/locality/type/monthly-INR filters, paginated results, property and manager profiles, preserved dated management history, honest loading/empty/error states. Eight clearly labelled synthetic examples in New Delhi, Mumbai, Bengaluru, Chennai, Jaipur, Pune, Hyderabad and Kolkata. No real rental availability or fabricated ratings. Rating filters arrive with reviews in Phase 4; women's filters arrive with eligible recommendations in Phase 5.

Base: unmerged Phase 1 final `749dd3e3ada2103f692da5d49d13bbaf811b1773`; its latest CI passed. Branch `phase-02-discovery` depends on `phase-01-accounts`. User authorized sequential continuation on 2026-10-06; no merge/deployment.

Migration `202610060001_discovery.sql` creates protected public records and dated associations, with a GiST exclusion constraint for overlapping management periods. End dates are exclusive; unknown current managers remain unknown. `property_discovery` is a security-invoker view and public writes are denied. Reference: [Supabase views](https://supabase.com/docs/guides/database/views), [PostgreSQL range constraints](https://www.postgresql.org/docs/current/rangetypes.html).

Synthetic seed data is versioned in this migration, so incremental installs and clean CI get the same examples without resetting accounts. Apply locally with `node node_modules/supabase/dist/supabase.js migration up --local`. Never reset the user's local accounts. Future Google helper restarts copy the repository migrations into its ignored work directory. Existing account keys/provider configuration are preserved.

Search treats `%` and `_` literally, searches current/historic manager names, uses a stable city/name/ID sort and twelve-record pages. Budget matching uses interval overlap, not a promise that every room fits the budget. Locality filtering requires a city, preventing same-named localities from mixing. No ratings means no ratings, never zero.

Checks: `npm run check`, `npm run test:db`, `npm run test:integration`, installed-Chrome production `npm run test:e2e`. [Execution record](test-cases.md), [beginner checklist](review-checklist.md). Google ownership/provider journey already verified in Phase 1; keys are never tracked. Physical Safari and production deployment remain outside this phase.

Implementation acceptance: PASS. Unit43, SQL33, live API5 and all45 distinct browser cases pass (initial42 plus corrected validation cases; targeted6 rerun). Final lint/type/build passes. Search/property/manager desktop and phone screenshots inspected; axe/overflow checks pass at all three sizes. Evidence in `evidence/`. Staged credentials scan and delivery follow; branch URL https://github.com/11gurnam/RentCheck/tree/phase-02-discovery. Next: Phase 3 per-user saves and property contributions, automatically under the user's continuation instruction.

Delivery: PASS. Implementation02e25528c998c3b226d6e9493f465af2892c040c pushed and verified against remote. [CI run37417028532](https://github.com/11gurnam/RentCheck/actions/runs/37417028532) completed successfully, including all45 browser cases with bundled Chromium. Documentation-only follow-up records delivery; branch latest SHA from gitrev-parse. No merge/deployment. Phase2 complete.
