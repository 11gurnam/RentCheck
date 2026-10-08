# RentCheck operations — Phase 12

The latest branch is `phase-12-real-data-operations`. Public deployment remains deferred. The existing local project retains its Google provider, accounts and fictional catalogue. Never reset its database or copy secret files into Git. These helper commands deliberately refuse hosted backends; hosted operations require provider-specific setup and a separately verified staging restore.

## Intake and manual evidence review

The database stores intake settings; browser roles and environment flags cannot enable real submissions. Default intake is fictional. An operator with the server-only service credential can explicitly change the local setting:

```powershell
node scripts/operations.mjs mode real 90 --confirm-real-intake
node scripts/operations.mjs mode demo 90
```

The number is the retention period for future evidence uploads, from 7 to 365 days. Enabling real intake does not relabel existing records. New property/manager forms describe real contributions and explicit publication permission. Real tenancy reviews must reference real properties; evidence must match its target's record type. Demo/real properties cannot be merged, and management associations cannot mix record types. Existing authors can correct their real reviews after new intake closes. Closing intake is not a full maintenance mode: existing discussions/replies and account controls remain usable.

Before real intake is enabled for actual users, provide the actual operator/contact information and hosting/authentication setup, restrict trusted administrator accounts, and confirm private storage and the public privacy notice. A software checklist cannot independently certify identity or ownership. This phase prepares controlled handling; it does not enable a public service or claim hosted acceptance.

For every real-evidence approval, reviewers must download the unexpired evidence, then record checks that it matches the applicant, matches the property/profile, and supports tenancy dates or representative authority. All three are enforced in SQL and saved to immutable audit with the decision reason. Reject unclear evidence; never approve solely because a user chose a role. Do not put document contents, identity numbers or bank information into public replies or decision reasons. Historical demo approvals retain their demonstration labels.

## Evidence and media cleanup

New evidence has a deadline based on its upload-time policy. Downloads are denied immediately after that deadline. Physical removal runs on demand through **Administrator area → Operations and cleanup** or:

```powershell
npm run ops:cleanup
```

The command queues expired evidence and retired/deleted photos, removes only registered object paths and acknowledges successful removals. Failed storage requests leave durable jobs for retry. Runs are bounded; repeat if the queue remains. Account closure also attempts immediate cleanup, and this command retries outstanding account-deletion jobs. Expiry preserves the recorded decision and audit while clearing its downloadable document path. Moderation-hidden review photos are not destroyed merely because their review is hidden; explicit photo removal, review deletion, expiry where applicable or account closure governs cleanup.

Run cleanup at least daily once operating with real evidence. No scheduler is installed by this phase. Review pending-job count and oldest-job time after each run. Inspect private server logs if jobs fail. Backups are separate from live object cleanup and need their own access and retention controls.

## Readiness and monitoring hooks

`GET /api/health` returns only `{"status":"ok"}` or `{"status":"degraded"}` and HTTP 200/503. It checks the database and authentication service with bounded waits; it does not certify storage, email delivery or Google-provider readiness. Monitor it with:

```powershell
npm run ops:health
```

The command exits unsuccessfully when readiness fails. `GET /api/admin/health` additionally reports intake mode, evidence expiry count and durable cleanup backlog, only for a verified trusted administrator. Anonymous requests return 401 and ordinary users 403. Responses are uncached and omit keys, emails, message bodies and object paths. The operations page shows the same private database metrics. Configure actual alerting/scheduling with the eventual hosting provider; no external monitor is connected here.

## Encrypted backup and restore drill

With writes paused and no test runner active:

```powershell
npm run ops:backup-check
```

The helper exports the local PostgreSQL database to a custom archive, encrypts it with AES-256-GCM, and separately encrypts all files from the two private media buckets plus a manifest. It adds and removes a uniquely named synthetic probe to verify a non-empty file round trip. It restores the archive into a uniquely named scratch database in the same dedicated local container, compares record counts, checks restored permissions/RLS, and restores/checks file bytes in a new private scratch bucket. It removes the scratch database, bucket and probe afterward. It never restores over the live database or overwrites its files. A failure exits unsuccessfully and stores encrypted diagnostics.

Encrypted files are under ignored `work/backups/`; the key is in ignored `work/backup-key.bin`. Restrict Windows permissions to the operator and move the key to a separately controlled secure location when retaining/exporting backups. Keeping key and backups together on one machine is not protection against compromise of that machine. Loss of the key prevents recovery. Never commit either. Keep retained backups for at most 30 days, rotate them manually, and record each removal; no automatic backup rotation is installed. The helper is a local restore drill, not a hosted disaster-recovery service. Provider configuration, DNS, external OAuth secrets, application environment and cluster-wide roles are not provisioned by the restored database.

An actual recovery must first restore to an isolated staging environment with user access disabled, replay post-backup account deletions and expired evidence cleanup from a separately retained private deletion ledger, verify authorization/storage and provider configuration, and only then switch traffic. Restoring an old backup can resurrect deleted records if those later actions are not replayed. The drill deliberately does not perform a live cutover.

Database backups alone omit stored file bytes; keeping database metadata and media together matters. See [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups) and [PostgreSQL pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

## Repeatable acceptance

```powershell
npm run test:db
npm run test:integration
npm run check
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:e2e
npm run test:recovery
npm run test:operations
npm run ops:backup-check
node scripts/check-browser-secrets.mjs
```

Run browser suites sequentially. The operations suite temporarily changes the local intake mode, uses only unique fictional fixtures, and restores the original mode in `finally`; never run it while actual users are submitting data. CI runs these checks on an isolated clean backend. Production builds must finish before browser tests begin. Start the preview afterward with `npm start` and keep Docker Desktop running.
