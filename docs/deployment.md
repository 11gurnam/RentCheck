# Deployment preparation — hosted demonstration

This is a prepared guide, not a deployment record. Use a separate staging Supabase project and a Node24 host. No hosting account/domain was supplied; nothing was published or merged. Records, evidence and approvals remain fictional demonstration examples.

## Accounts and database

The account owner chooses hosting/domain, creates a hosted staging Supabase project, and stores credentials in private host/provider settings. Local Docker accounts, test passwords and callback URLs are not hosted configuration.

Check out phase-12-real-data-operations (or its reviewed, approved merge), then npm ci. Authenticate the Supabase CLI, link the confirmed staging project and inspect migrations before applying them. See [Supabase migration workflow](https://supabase.com/docs/guides/deployment/database-migrations).

```sh
npx supabase login
npx supabase link --project-ref YOUR_STAGING_PROJECT_REFERENCE
npx supabase db push --dry-run
npx supabase db push
```

Run these only after confirming the intended staging project. Migrations include fictional multi-city seeds, private tables, permissions and functions. Keep only public schema exposed through the Data API; private tables must remain unexposed and denied to API roles. Never apply local test SQL or reset a database containing user data. Local environment/test/demo helpers are guarded for loopback and must not be repurposed for hosting.

## Storage

Enable Storage and create exact bucket names review-photos and rental-documents. Both PRIVATE, file limit5242880 bytes, allowed MIME image/jpeg. The app accepts bounded JPEG/PNG/WebP input and re-encodes JPEG. Inspect existing settings rather than assuming an existing bucket is private. [Supabase bucket creation](https://supabase.com/docs/guides/storage/buckets/creating-buckets) documents privacy and restrictions.

Do not add API-role object read/write policies for these buckets. Authorized server streams and service-only registration handle access. No signed URLs are used: every photo download rechecks visible review/property, and every private-document download rechecks the current owner/admin.

## Environment and auth

Set these host values BEFORE building:

| Variable | Visibility and value |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Hosted project HTTPS URL; browser public |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable/legacy anon key; browser public |
| SUPABASE_SERVICE_ROLE_KEY | Same project's service-role/secret key; server only |
| SITE_URL | Exact HTTPS website origin |
| GOOGLE_AUTH_ENABLED | true only after hosted Google provider setup |

Public variables enter the browser build, so rebuild when changing them. Keep privileged keys out of NEXT_PUBLIC_ variables and Git. Google secret belongs in Supabase provider settings.

Set Supabase Auth Site URL and exact hosted /auth/callback and /auth/confirm redirect destinations. Use the confirmation and recovery template patterns in supabase/templates/confirmation.html and supabase/templates/recovery.html and real hosted email delivery for nonlocal confirmation.

Configure a Google web OAuth client with the HTTPS website origin and the hosted Supabase callback shown in its Google provider settings, commonly https://PROJECT.supabase.co/auth/v1/callback. Add intended testers to the consent audience while testing; enter ID/secret privately into Supabase. [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) explains client/provider configuration. Repeat real Google login, alias persistence and logout on the hosted origin; local success does not prove hosted callbacks.

## Trusted administrator

Register the staging administrator normally. A trusted database operator verifies the exact auth.users/private.accounts UUID and assigns private.administrator_grants with an audit reason through SQL Editor. No migration/seed default admin exists. Alias, email domain and Google role metadata never grant admin. Local-demo credentials must not be copied to hosting.

```sql
-- Trusted operator only; substitute the verified staging account UUID.
insert into private.administrator_grants(user_id, reason)
values ('VERIFIED_ACCOUNT_UUID', 'Authorized staging demonstration administrator');
-- For a deliberate later revocation of that same verified account:
delete from private.administrator_grants where user_id = 'VERIFIED_ACCOUNT_UUID';
```

Database permission checks make grant/revoke take effect in the existing session. Operator access remains separate from public account controls.

## Node host

Use Node24 with Next SSR, Server Actions and Sharp. npm run build then npm start supports a Node deployment behind HTTPS/reverse proxy. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting) covers startup, proxying and streaming.

Allow the app's 6MiB Server Action envelope and 5MiB image input at the proxy/provider. A smaller host upload limit needs an intentionally reduced app limit and tests. Preserve external Host/origin. Do not cache authenticated pages, private documents, photo streams or authorization failures. Static HTML export cannot host these account/database features. Multi-instance cache/Server Action key coordination and catalogue-lock throughput require an explicit hosting design; current acceptance uses one Node instance.

## Staging smoke checks

Repeat the final checklist at the hosted URL with NEW fictional accounts: Google/email confirmation/logout/alias, nonadmin denial, combined search/saves, review creation/edit/delete/photos, private-document denial, verification threshold/revoke, claims/replies/revocation, reports keep/remove, historic associations, explicit conflict merge and audit. Check another account/incognito and physical phone. Scan browser assets after the staging build.

The staging operator owns backups and evidence/audit retention. Phase 12 adds evidence expiry, durable registered-media cleanup and encrypted local restore checks; see [operations](operations.md). Configure hosted scheduling, private object backups and post-backup deletion replay before real-user operation. Local helpers refuse hosted targets. Publishing a demonstration is separate from approving real data collection, real verification or a public launch.
