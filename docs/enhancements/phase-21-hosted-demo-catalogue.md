# Phase 21 — visible hosted demo catalogue

On 12 October 2026 the owner requested dummy data on the hosted site again. Eight original, clearly labelled demo properties were restored in Bengaluru, Chennai, Hyderabad, Jaipur, Kolkata, Mumbai, New Delhi and Pune, together with their existing demo manager profiles. No real records were relabelled, no user credentials or reviews were invented, and real intake remains closed.

`scripts/hosted-demo-catalogue.sql` checks closed real intake and all eight original demo identifiers before updating only those properties and the five original demo managers. Its single DO statement applies atomically. It records the sample-visibility reason through the existing audited operator function. It was tested against the local database inside a rolled-back transaction, then applied to the explicitly named hosted staging project through the Supabase CLI.

Anonymous hosted reads verified eight labelled listings, and searches for every city passed. The production website's Explore page displayed all eight. This is a database change: the application did not need rebuilding or redeploying. The latest application deployment remains Phase 20, deploy `6accab3ce914ca380b026254`; the additional UI/migration changes pulled from GitHub have not been deployed by this phase.

## Check the demo

Open https://rentcheck-india.netlify.app/search. Expect eight accommodation examples. Choose Jaipur or Mumbai in City and click Apply filters. Open a property to inspect its details and current manager. Demo labels remain visible and records have no invented tenant ratings.

## See the database

Open https://supabase.com/dashboard/project/qbvuwjyamktzwimisvet/editor and sign in with the existing Supabase project-owner account. Select RentCheck Staging, schema public, then properties. Each row is a property and each column is a field, such as name, city or rent_min. Use Authentication → Users for login accounts, and Storage for uploaded files. The RentCheck app password and application administrator role are separate from dashboard access.

| Data | Location |
| --- | --- |
| Properties and managers | public.properties, public.landlords |
| Manager/property history | public.management_associations |
| Public aliases and reviews | public.public_profiles, public.reviews |
| Login identities | Authentication → Users (auth.users) |
| Account links, tenancy, claims, evidence metadata | private.accounts, private.tenancies, private.claims, private.documents |
| Photo and evidence files | Storage: review-photos, rental-documents |

Private schemas are not public application endpoints. IDs connect related rows; stored file paths connect metadata to Storage objects. Save an alias in the app, refresh the corresponding public_profiles row, and compare its public_alias value.

## Where to push

Repository: https://github.com/11gurnam/RentCheck. This phase uses phase-21-hosted-demo-catalogue. Push code to the shared current phase branch after coordinating with other contributors. A Git push currently does not publish the website: Netlify uses manual CLI deployments because the repository/hosting accounts are not connected for automatic builds. Code changes require testing, a Linux Netlify build and a production deployment of the prepared .netlify/static output with generated functions. Schema migrations must also be reviewed and applied separately. Database row changes, such as these demo listings, are read by the hosted app immediately.
