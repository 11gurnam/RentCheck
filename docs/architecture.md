# Architecture

## Foundation and boundaries
One Next.js App Router application with strict TypeScript, React, Tailwind, Zod, Supabase PostgreSQL/Auth/Storage, Vitest and Playwright. npm lockfile pins the installed dependency graph. Use Node 24 LTS; dependencies selected from maintained stable registry tags at setup (2026-10-05), no automatic upgrades. See package.json for exact versions. Installation references: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

- `src/app`: thin routing/layout/server entry points; validate, authorize, call a feature, respond.
- `src/features`: cohesive properties, landlords, reviews, claims, moderation, saved-properties; create modules as implemented. Foundation introduction is a separate presentation feature.
- `src/components/ui`: small accessible shared presentation; introduce shared components only when useful.
- `src/lib`: verified auth sessions, request-scoped server database client and small utilities. Cookie refresh runs through the Next.js proxy; no browser privileged keys.
- `supabase/migrations`: versioned accounts schema/permissions; subsequent schema arrives as phases require.
- `tests/browser`: critical journeys; `tests/integration` uses isolated local Supabase for live authentication and direct API permissions; `supabase/tests` tests database roles/permissions transactionally.
- `docs`: canonical specification, model and phase evidence.

Separate useful validation/domain/data/presentation responsibilities; no generic repositories, empty layers, classes/DI/global-state libraries/microservices. Pure named rules remain independently testable. Composition and small interfaces only at genuine dependency/test boundaries. Server operations hold authorization and database operations outside presentation.

## Implemented relational model (Phases1–8)
| Entity | Key fields and constraints | Phase |
| --- | --- | --- |
| Private accounts | private.accounts maps auth user ID to independent public profile ID; identity/email stays in protected auth.users; private.administrator_grants is separately controlled | 1 |
| Public profiles | independent random profile ID, public alias and timestamps; no auth ID/email/photo/name | 1 |
| Properties | ID, address/state or union territory/city/locality/type, min/max rent INR, contributor, status | 2 |
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
Use private document buckets with fresh authorized server streams, validated uploads and synthetic data only; no signed links. Photos validate type/size, content where feasible, ownership and storage access. New schema gets deny-by-default policies and direct-access integration tests before exposure. Atomic review/tenancy writes and merges use SQL transactions/functions with authorization; resolve uniqueness/overlap conflicts explicitly. Conflicting reviews never silently overwrite; saves deduplicate; claims/association conflicts need an admin resolution before merge. Audit is part of the transaction. Review/photo deletion retention details must be documented at implementation.

## Test and environment strategy
Vitest covers pure rules and boundary conditions. Browser tests use production build without Supabase credentials in Phase 0. Later integration tests require disposable local/test Supabase; refuse production targets and provide deterministic synthetic seeds/reset. Credentials or provider setup blockers keep affected phases incomplete. CI runs clean install, lint, types, unit tests, production build and Chromium journeys at desktop/tablet/phone sizes. Manual screenshot review supplements automation, never implies full accessibility certification.

Linting uses ESLint 10, typescript-eslint and React Hooks rules directly. At setup, Next's bundled lint config pulled an unpatched braces advisory and plugins whose peer ranges excluded ESLint 10; ESLint 9 was marked unsupported. Direct supported rules avoid that dependency chain. Automated axe checks and manual keyboard/visual checks cover the introduction's accessibility. TypeScript 6.0.3 is pinned because the current parser supports versions below 6.1; TypeScript 7 is not yet compatible. Type checks generate Next route types before running tsc, including on clean checkouts.

## Accounts implementation
Supabase SSR uses HTTP-only SameSite=Lax cookies. Proxy verifies/refreshes claims, protected pages and mutations independently call getUser for live session verification. API endpoints return 401/403; protected pages redirect to sign-in. Only allowlisted internal paths survive auth redirects; callback origin comes from SITE_URL rather than request headers. Server Actions provide mutation origin checks, validate input and return generic errors. Account responses are private/no-store. Logout revokes the current session; other-device logout and password recovery are outside Phase 1.

Auth-user insertion transaction creates public alias + private account mapping. Explicit registration alias is validated; Google names/emails/photos/role metadata never become public identity or privileges. Invalid/missing alias metadata gets a generated Tenant alias. API roles have only column-limited public SELECT; mutation RPC sets only the current user's alias. Private schema is neither exposed nor granted to API roles; administrator grants are managed only by a trusted database operator. is_administrator reads the current database grant, so revoked grants do not survive in stale user metadata. Account paths do not use a service key. Phases4–8 use a server-only media client for validated uploads/downloads and service-only registration after verified user authorization; ordinary review/claim/admin actions use the request-scoped authenticated client. The local test harness uses an ephemeral secret key from an ignored file to create/remove synthetic test users, with a loopback/port guard.

Setup follows [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Google provider](https://supabase.com/docs/guides/auth/social-login/auth-google). Provider configuration and an actual Google-account journey must be verified independently of local auth tests; Google credentials cannot be invented. Account confirmation uses a private email token handled by /auth/confirm; replay is tested. Review, claimant and admin workflows are implemented; every private operation rechecks database authorization.

## Phase4 media boundary
Private bucket denies direct client operations. Server-only media client receives SUPABASE_SERVICE_ROLE_KEY from ignored config, verifies user/ownership before uploads and calls a service-only registration transaction. Sharp validates bounded image content and re-encodes JPEG without metadata. Fresh public visibility gates every no-store photo download. Keys are scanned out of staged changes and browser bundles. No signed URL allows a removed photo to stay accessible; private blobs intentionally retained for prototype audit.


## Moderation, merges and final release
Private claim/reply/report evidence stays separated from public projections. Reasoned verification/claim/report/detail/association/merge changes retain immutable private audit. Women's eligibility remains explicit private answers, derived only from approved visible reviews. Approved representatives never mutate tenant review content.

Management associations now retain inactive archived periods; public RLS exposes active published history. A tenancy stores the manager/association snapshot at its start and later history corrections never rewrite it. Merge retains losing tenancies/reviews/evidence privately, active canonical uniqueness via a generated nullable property key, explicit claim revocations, save deduplication, source ownership guards and full before/after audit. Third-profile duplicate uncertainty transfers to the survivor. A coarse transaction-level catalogue lock serializes prototype mutations; former unlocked functions are inaccessible in private schema. No source review can commit behind a finished merge. Source is archived publicly; surviving target carries resolved canonical records.

Public experience pages use a safe20-row projection with total and stable timestamp/ID order; scores/counts aggregate all eligible reviews. Admin audit uses50-row pages and entity/action filters, so retained older records remain accessible. Recovery refreshes server data as it resets the boundary; isolated serial tests briefly deny one local RPC and restore grants in finally. Root/profile errors show generic messages, no private diagnostics. The complete source is on phase-08-release, with phase evidence/checklists and hosted-demo preparation; no deployment or main merge.


## Enhancements 09–12

The sections above record the original prototype. Phase 09 adds landlord galleries, current photo provenance and rating attribution preview. Phase 10 adds recovery, private PDF normalization, decision notifications and account closure with durable media purge. Phase 11 adds participant-only conversations, opt-in approved-representative matching, block/report controls, three-property comparison and explicitly maintained coordinates. Phase 12 adds database-authoritative intake mode, immutable demo/real record types, evidence deadlines and manual approval checklists. Expired downloads are denied immediately; on-demand cleanup physically removes registered expired/retired media. Public/private readiness endpoints, administrator queue metrics and encrypted local database/object restore checks are documented in [operations](operations.md). Scheduling, hosted acceptance and recovery cutover remain deployment tasks.
