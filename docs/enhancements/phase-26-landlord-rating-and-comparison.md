# Phase 26 — visible landlord ratings and comparison

Property reviews now include a distinct “Rate your landlord / management” star section for communication, maintenance and deposit handling. It is optional, uses whole stars from 1–5, and waits for tenancy-date attribution before enabling a new review's control. “Leave landlord unrated” clears it. This keeps accommodation criterion scores separate and preserves existing database rating semantics; no landlord-only review or fabricated score was introduced.

Comparison includes “Landlord / management rating” with the current recorded manager's aggregate and rated-review count, separate from “Tenant rating.” Property profiles also show that manager score. Historic tenancy ratings stay with their attributed landlord; they do not move to a new manager. No ratings display as an empty state.

Check: open a place → Write a review → supply tenancy start date → confirm the named landlord → select landlord stars and accommodation criteria separately. Submit and inspect the landlord profile. Compare two places and check the separate property and landlord rows. Editing/deleting a review must continue to update eligible aggregates.

The browser review journey now selects the landlord stars and exercises create/edit/photo/delete workflows. A comparison test creates different property/landlord scores, checks them independently against database aggregates and cleans up the temporary fixture. A detected star-pointer interception was fixed before the regression run.
