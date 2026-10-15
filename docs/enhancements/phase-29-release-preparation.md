# Phase 29 combined release preparation

The source incorporates origin/main at 2e184d8, including GK's latest property layouts, owner actions, map discovery, contact settings, PDF claims and review improvements. The local release fixes are preserved and included: explicit Netlify Next.js adapter configuration at version 5.16.2, plus an independent claim reviewer in the account privacy browser fixture.

## Validation on 15 October 2026

- npm run check passed: lint, TypeScript, all 95 unit tests across 17 files and the production build.
- Browser asset scanning passed for 60 generated assets; no configured private values were found.
- GitHub run 38710222471 for 2e184d8 passed database, integration and application checks. Its browser suite was still running when this note was prepared; this is not a claim that the full regression suite passed.
- An encrypted schema, data and private-media backup was completed before migration. The backup contains five media objects and remains outside Git. This release did not repeat a full backup restoration exercise.
- The three new migrations passed against the verified isolated native PostgreSQL database. Private schema and contact-function permission checks passed.
- Applied to hosted Supabase: 202610140002_pdf_evidence_storage.sql, 202610140003_active_review_counts.sql and 202610150001_property_phone_contact.sql. No seed or reset was run.

## Deployment is blocked by Netlify credits

Netlify's production deploy 6ad0970f01ddabc99793bd59 for 2e184d8 was rejected with: Skipped due to account credit usage exceeded. Do not report the newest source as deployed. No paid plan or credit purchase was authorized or performed.

The subsequent site check found 404 responses. Restored the previously verified production deployment 6acf150b8be94309c6f454c2, built from fb79f7b. Its homepage, sign-in and health endpoints returned 200.

The restored release passed 11 live browser checks: password sign-in, ordinary-account admin denial, persistent alias, initial and replacement profile photos including an original above 3 MiB, state/city and PIN reset, real map tiles, authenticated address lookup, separate landlord comparison rating, phone overflow check, account accessibility and logout. Temporary test accounts and photos were removed. These checks describe the restored release, not the newly merged app.

GitHub-to-Netlify linking is configured for 11gurnam/RentCheck, production branch main. The explicit adapter ensures server routes are packaged rather than publishing an unusable static .next directory. Publishing still requires available Netlify credits or a separately configured host. After release, verify that the published commit matches main and repeat the hosted tests against that version.

## User checks after the next successful publication

1. Sign in, change the profile photo twice and refresh; confirm the image stays.
2. Open a property and inspect the compact layout, ownership actions and reviews. Review the landlord rating separately in comparison.
3. Use Add place to choose state/city and a map address. Check the PIN manually before saving; it is editable.
4. Check the map catalogue, including places without saved coordinates, and pagination with filters.
5. If testing an approved owner account, save phone settings privately first. Public display is opt-in and must depend on an approved claim.
6. Test a PDF claim with a non-sensitive test document. Confirm only the appropriate account/reviewer can retrieve it.

Keep demo records labelled. Real-data intake remains closed. Payments, subscriptions and a managed rental service are future business work.
