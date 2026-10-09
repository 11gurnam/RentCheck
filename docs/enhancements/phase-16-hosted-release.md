# Phase 16 — hosted release

RentCheck is published at https://rentcheck-india.netlify.app on Netlify Free. Automatic paid top-ups are disabled. The public catalogue is empty; all fictional seeded properties, landlords and their reviews are unavailable publicly. Real-data intake remains closed while operational setup is completed.

## Verified on 9 October 2026

The Linux Next.js/Netlify adapter build succeeded. The current public deployment is `6ac8cbbd9f486c1ee37dfd39`. Manual deployments must upload `.netlify/static`, with the generated server/edge functions retained; uploading `.next` directly exposes server build files. The first upload was corrected. All 4,134 Next build files were checked and contained no configured server or Google credential values; the 33 browser assets also passed their secret scan.

Netlify inherited the team's private-project setting. A project-specific override made RentCheck publicly accessible. Team defaults were not changed.

Eleven live HTTP checks passed: homepage/search/privacy/health load; signed-out administrator health and document access return 401; old demo property and landlord URLs return 404; the scheduled cleanup URL rejects public invocation with 403; server build files and the private environment file return 404. Public health returns only `{"status":"ok"}`. This does not establish authenticated workflow acceptance.

Supabase's site URL and two exact callback destinations are configured for this origin. The Google provider is enabled and email confirmation remains required. Email-template changes were rejected on the free plan without custom SMTP, so they are deferred rather than bypassing confirmation. Google Cloud callback approval and support mailbox credentials are owner steps still pending.

The source also removes prototype wording from the shared account footer; that last wording correction needs the next complete build/deploy. No real-document intake, email delivery, Google end-to-end login, cleanup execution or hosted backup/restore acceptance is claimed complete. A hosted schema dump has been obtained privately; it is not a complete data/media backup.

## How to check

1. Open the hosted homepage and `/search` in an incognito window. They should load without a Netlify team login and show no invented listings or ratings.
2. Open `/privacy` and check RentCheck Team / rentchecksupport@gmail.com.
3. Open `/api/health`: expect `{"status":"ok"}`. Open `/api/admin/health` while signed out: expect access denied.
4. Complete the Google callback approval and SMTP app-password steps directly in the provider pages. Keep credentials in ignored local configuration/provider settings, never in Git or chat.
5. After authentication is accepted, test alias persistence, logout, administrator denial, signup confirmation and password recovery. Real Jaipur contributions are a later intake step; genuine reviews must come from their actual authors.
