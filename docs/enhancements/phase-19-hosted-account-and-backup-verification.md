# Phase 19 — hosted account and backup verification

Verified on 12 October 2026 against https://rentcheck-india.netlify.app and hosted Supabase project `qbvuwjyamktzwimisvet`.

The support mailbox received the actual confirmation email. Its delivered token-hash link established a hosted session and opened the account page. Public alias changes persisted after refresh, the original RentCheck Team alias was restored, administrator access remained Not granted, and logout returned to the signed-out sign-in page.

Password recovery initially failed with HTTP 429 (`over_email_send_rate_limit`): custom SMTP had retained the default allowance of two messages per hour. The scoped auth configuration now allows ten messages per hour. The hosted recovery form subsequently succeeded, the support mailbox received “Reset your RentCheck password,” and its delivered link opened the hosted password form. The owner must choose and submit their private password and verify subsequent login; that final credential action has not been performed by the agent.

Encrypted schema, data, roles and media-manifest exports were created. The isolated scratch restore checked all 66 exported COPY tables against their row counts, preserved RLS/private-schema/service-only function restrictions and retained closed intake. Both hosted buckets were private and empty, so zero uploaded objects were available for recovery testing. Roles were exported but not applied to the shared local cluster. Scratch resources were removed; the live hosted database and original local database were not restored over. The reusable `ops:hosted-backup-check` command separately guards the hosted project, CLI link and local restore target.

The cleanup routine completed against hosted Supabase. The production handler also returned HTTP 200 when invoked by the operator locally with a published-production context and hosted configuration. This is a handler/backend acceptance check, not a Netlify scheduler invocation. Netlify's historical logs only supplied a duration record; successful scheduler execution is still unverified. The daily deployed schedule remains 07:30 India time.

Anonymous reads still return zero properties, landlords and reviews. No fictional records were published and real intake remains closed. Google branding is prepared under RentCheck India / rentchecksupport@gmail.com at the required policy agreement. Its replacement OAuth client is not yet created or enabled in the application.

## Remaining launch work

- Owner acceptance of Google's policy and creation of the replacement OAuth credential, followed by provider configuration and hosted Google login tests.
- Owner password submission and subsequent email/password login check.
- Actual scheduled cleanup acceptance, external alert delivery, automated off-site backup retention and independent key custody; non-empty media recovery when genuine uploads exist.
- Designation of trusted operator access and authenticated acceptance of real submission/evidence/moderation workflows before enabling real intake.
- Provider account ownership/access under the project mailbox. Netlify and Supabase ownership have not been transferred.

## How to check

1. Use the open RentCheck password form to choose a private password. Sign out, then sign back in with the support address. If its ten-minute session expired, request a new link from `/forgot-password`.
2. Save an alias on `/account`, refresh, and verify it persists. Ordinary accounts must display Administrator access: Not granted.
3. Review and accept the Google agreement in the open in-app tab, then finish project branding. The next prepared step is a Web application client using the hosted origin and exact Supabase callback.
4. Run `npm run ops:hosted-backup-check` from the repository while rental intake and media writes are closed. Expect a safe report with table counts and preserved authorization; no plaintext export or credential should enter Git.
