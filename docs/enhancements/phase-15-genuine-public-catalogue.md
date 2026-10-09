# Phase 15 — genuine public catalogue

The owner requested no fictional content on the hosted site. Public staging now has no published properties, landlords or reviews. Fictional seed records are hidden rather than relabelled as genuine; their provenance remains intact. Local test fixtures remain available.

Migration `202610090001_public_catalogue_mode.sql` adds an operator-only, audited sample-visibility control. Disabling samples hides published demo properties and landlords and rejects new demo contributions at the database boundary. It does not hide genuine records, erase review history or enable real-data intake. Switching samples back on does not automatically republish hidden records.

The homepage and privacy page omit demonstration wording when samples are disabled. While both demo and real intake are closed, the contribution page explains that genuine property submissions are not open yet. No fictional reviews, ratings or verification decisions are presented as genuine.

## Validation

All 255 database checks, 77 unit tests, lint and TypeScript checks passed. The new database tests cover anonymous/signed-in denial of operator configuration, preservation of genuine records, hidden demo profiles, and refusal of new demo records. All 18 migrations are applied to the intended hosted Supabase project. An anonymous hosted API check confirmed zero visible properties, landlords and reviews and both intake flags disabled.

The isolated Linux Netlify build completed, including Next.js server/middleware and the cleanup function. All 33 browser assets passed the configured-secret scan. Publishing and live application checks are still in progress; Google Cloud verification and SMTP credentials require owner actions.

## How to check after publishing

1. Open `https://rentcheck-india.netlify.app/search`. It should show an empty catalogue, without invented ratings or listings.
2. Old demo property/landlord URLs should be unavailable on the hosted site. Local examples can remain visible on `http://127.0.0.1:3000`.
3. The homepage should use RentCheck branding, without hackathon/prototype or fictional-data wording. `/privacy` should show RentCheck Team and rentchecksupport@gmail.com.
4. A signed-in user opening `/properties/new` should see that genuine submissions are not open yet. Enabling real intake is a separate operational step, followed by actual Jaipur contributions and genuine tenant reviews.
5. `/api/health` should return only a public status; signed-out administrator endpoints and private document downloads must deny access.

Keep real documents out until hosted authentication, email recovery, cleanup and backup/restore checks are accepted. A compiled package or empty catalogue is not evidence that those flows have passed.
