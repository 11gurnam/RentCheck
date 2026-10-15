# Profile, review and claim improvements

The account photo dialog now shows the current avatar, previews a replacement, and saves only after confirmation. Review photos use the existing picker (five images, 3 MiB each); editing a review no longer adds a second upload form. Successful actions show a shared toast and close their enclosing action dialog. Errors preserve the form for correction or retry.

Landlord ratings have a hover, keyboard and tap explanation. Map selection fills editable address fields and cancels stale lookups. Comparison starts with up to three available shortlisted properties. Typography, button sizes and spacing use shared CSS tokens.

Published review counts exclude deleted reviews, including administrator summary counts. Moderation records and audit history remain available. Empty properties show zero reviews without an empty category-rating panel.

## Deployment

Apply `202610140003_active_review_counts.sql`, `202610140002_pdf_evidence_storage.sql` and `202610150001_property_phone_contact.sql` through the normal migration workflow, then deploy the application. These migrations have been applied locally; the hosted database has not been changed by this task.

An older local private evidence bucket accepted JPEG only. The storage migration permits sanitized PDF evidence as well, without changing bucket privacy or access rules. PDF workers now receive a native resolved dependency path, including when the server working directory changes. Claims accept up to three documents, 3 MiB each and 4 MiB in total, with friendly validation and configuration errors. The hosted PDF claim still requires verification after deployment; no hosted server logs or deployment credentials were available for this task.

The local backend's existing contribution-location migration was reapplied after confirming the postal-code column was missing despite its migration-history entry. This does not reset property records.

External property-pin links use the shared Google Maps URL helper, including property details, comparison and the map page. These links open Google Maps without a Google Maps API key. Embedded maps continue to use Leaflet with OpenStreetMap tiles; address search and reverse lookup use Photon, which is based on OpenStreetMap data. No Google Maps API or billing key is required for these flows. Public provider usage limits still apply.

The map explorer searches the full published catalogue, including cities and properties without coordinates. Address-only properties have an external address-search action; only saved coordinates become map pins. City/type filters, a pins-only filter, rent cards, clickable pins and map controls share the selected property. Catalogue data is fetched in batches. Tiles load on request and marker labels use text nodes.

Property actions distinguish declared owners and pending, approved and disputed claims. Active claims lead to their status instead of a duplicate application; approved representatives can manage details and photos. Owners do not see tenant-only shortlist, self-review, self-contact or reporting actions. Demo approvals retain their demonstration labels.

Account contact settings store optional Indian mobile numbers privately. Public display requires explicit consent and a currently approved claim for that published property. Disputing or revoking the matching claim removes its public phone display. Private settings are restricted to the signed-in account. In-app messages remain separate from public phone visibility.

Admin application actions use icon-only hover/click menus with distinct decision colours and preserve the existing confirmation flow. Navigation uses a delayed centered loading backdrop. Reviews, document controls, property layout and search pagination have compact responsive spacing; pagination preserves filters and disables unavailable directions.

## Validation

Unit tests cover PDF sanitization and dependency resolution. Integration tests verify review counts and averages before and after deletion, including zero-review properties and administrator counts. Browser tests cover profile preview/cancel/upload/failure preservation, PDF claims and private retrieval, report/delete feedback, map auto-fill and stale requests, shortlist defaults, and multiple review-photo uploads.

Additional desktop/mobile journeys cover map catalogue filtering and missing pins, numbered pagination, compact reviews, owner/claim states, private phone saving, opt-in public contact, dispute removal, action menus, document zoom and centered navigation loading. TypeScript, lint and unit checks run without a production build.

Google sign-in has its provider icon and pending feedback. The local Google provider is disabled. A browser check verified the OAuth redirect and PKCE request with a simulated provider endpoint; a real Google account callback and provider latency still need testing against an enabled deployment.
