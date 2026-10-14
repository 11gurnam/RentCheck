# Profile, review and claim improvements

The account photo dialog now shows the current avatar, previews a replacement, and saves only after confirmation. Review photos use the existing picker (five images, 3 MiB each); editing a review no longer adds a second upload form. Successful actions show a shared toast and close their enclosing action dialog. Errors preserve the form for correction or retry.

Landlord ratings have a hover, keyboard and tap explanation. Map selection fills editable address fields and cancels stale lookups. Comparison starts with up to three available shortlisted properties. Typography, button sizes and spacing use shared CSS tokens.

Published review counts exclude deleted reviews, including administrator summary counts. Moderation records and audit history remain available. Empty properties show zero reviews without an empty category-rating panel.

## Deployment

Apply `202610140003_active_review_counts.sql` and `202610140002_pdf_evidence_storage.sql` through the normal migration workflow, then deploy the application. These migrations have been applied locally; the hosted site has not been changed.

An older local private evidence bucket accepted JPEG only. The storage migration permits sanitized PDF evidence as well, without changing bucket privacy or access rules. PDF workers now receive a native resolved dependency path, including when the server working directory changes. Claims accept up to three documents, 3 MiB each and 4 MiB in total, with friendly validation and configuration errors. The hosted PDF claim still requires verification after deployment; no hosted server logs or deployment credentials were available for this task.

The local backend's existing contribution-location migration was reapplied after confirming the postal-code column was missing despite its migration-history entry. This does not reset property records.

## Validation

Unit tests cover PDF sanitization and dependency resolution. Integration tests verify review counts and averages before and after deletion, including zero-review properties and administrator counts. Browser tests cover profile preview/cancel/upload/failure preservation, PDF claims and private retrieval, report/delete feedback, map auto-fill and stale requests, shortlist defaults, and multiple review-photo uploads.

Google sign-in has its provider icon and pending feedback. The local Google provider is disabled. A browser check verified the OAuth redirect and PKCE request with a simulated provider endpoint; a real Google account callback and provider latency still need testing against an enabled deployment.
