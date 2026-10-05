# Architecture

## Foundation and boundaries
One Next.js App Router application with strict TypeScript, React, Tailwind, Zod, Supabase PostgreSQL/Auth/Storage, Vitest and Playwright. npm lockfile pins the installed dependency graph. Use Node 24 LTS; dependencies selected from maintained stable registry tags at setup (2026-10-05), no automatic upgrades. See package.json for exact versions. Installation references: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

- `src/app`: thin routing/layout/server entry points; validate, authorize, call a feature, respond.
- `src/features`: cohesive properties, landlords, reviews, claims, moderation, saved-properties; create modules as implemented. Foundation introduction is a separate presentation feature.
- `src/components/ui`: small accessible shared presentation; introduce shared components only when useful.
- `src/lib`: auth/database clients and small utilities; environment validation currently implemented. Backend clients arrive with accounts.
- `supabase/migrations`: versioned schema/RLS as phases require, no placeholder schema now.
- `tests/browser`: critical journeys; `tests/integration` will use isolated nonproduction Supabase.
- `docs`: canonical specification, model and phase evidence.

Separate useful validation/domain/data/presentation responsibilities; no generic repositories, empty layers, classes/DI/global-state libraries/microservices. Pure named rules remain independently testable. Composition and small interfaces only at genuine dependency/test boundaries. Server operations hold authorization and database operations outside presentation.

## Planned relational model (introduced incrementally)
| Entity | Key fields and constraints | Phase |
| --- | --- | --- |
| Private accounts | auth user ID; private identity; protected administrator assignment | 1 |
| Public profiles | account ID, public alias; explicitly safe projections | 1 |
| Properties | ID, address/locality/type, min/max rent INR, contributor, status | 2 |
| Landlords | ID, public name, status; identity linkage private when present | 2 |
| Management associations | property/landlord IDs, start/end; no conflicting current periods | 2, 7 |
| Saves | unique account/property | 3 |
| Duplicate candidates | source/target IDs, certainty, decision/status | 3, 7 |
| Tenancies | account/property/start/end/current/rent; canonical unique identity; historic association ID | 4 |
| Reviews | unique tenancy ID; author; separate ratings/text; visible/deleted/removed; timestamps; self-identification/recommendation | 4 |
| Review photos | review/storage path, validated mime/size; ownership rules | 4 |
| Verification requests | tenancy/private document path/status/admin decision/reason | 5 |
| Claims | account/property or landlord target; evidence/status/decision | 6 |
| Replies | review/approved claimant/text/timestamps | 6 |
| Reports | review/reporter/reason/status; review remains visible pending decision | 7 |
| Audit records | actor/action/entity/previous/new/reason/time; restricted immutable retention | 5–7 |

Landlord attribution is attached to tenancy's historic association, not resolved from current property ownership. Subsequent management changes cannot reassign old landlord ratings. Aggregates derive from visible eligible records; transaction-backed changes maintain consistent state. Public removed/deleted reviews excluded while restricted audit remains.

## Security and atomicity plan
Authenticated identity supplies account IDs; never trust role/author IDs from clients. Server checks plus database RLS and storage policies cover direct access. Prevent self-admin escalation and claimant modification of tenant content. Approved claims authorize only allowlisted detail updates and replies. Own-property prohibition uses trustworthy ownership/approved claims and is rechecked transactionally. Private account tables/documents deny other accounts and anonymous users. Publishable keys can reach browser; privileged keys cannot.
Use private document buckets with limited signed access, validated uploads and synthetic data only. Photos validate type/size, content where feasible, ownership and storage access. New schema gets deny-by-default policies and direct-access integration tests before exposure. Atomic review/tenancy writes and merges use SQL transactions/functions with authorization; resolve uniqueness/overlap conflicts explicitly. Conflicting reviews never silently overwrite; saves deduplicate; claims/association conflicts need an admin resolution before merge. Audit is part of the transaction. Review/photo deletion retention details must be documented at implementation.

## Test and environment strategy
Vitest covers pure rules and boundary conditions. Browser tests use production build without Supabase credentials in Phase 0. Later integration tests require disposable local/test Supabase; refuse production targets and provide deterministic synthetic seeds/reset. Credentials or provider setup blockers keep affected phases incomplete. CI runs clean install, lint, types, unit tests, production build and Chromium journeys at desktop/tablet/phone sizes. Manual screenshot review supplements automation, never implies full accessibility certification.

Linting uses ESLint 10, typescript-eslint and React Hooks rules directly. At setup, Next's bundled lint config pulled an unpatched braces advisory and plugins whose peer ranges excluded ESLint 10; ESLint 9 was marked unsupported. Direct supported rules avoid that dependency chain. Automated axe checks and manual keyboard/visual checks cover the introduction's accessibility. TypeScript 6.0.3 is pinned because the current parser supports versions below 6.1; TypeScript 7 is not yet compatible. Type checks generate Next route types before running tsc, including on clean checkouts.
