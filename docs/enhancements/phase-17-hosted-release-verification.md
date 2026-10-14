# Phase 17 — hosted release verification

Verified on 12 October 2026. RentCheck remains published at https://rentcheck-india.netlify.app. Deployment `6acc77c9dd77be3b6efc614c` includes the India-wide account footer correction committed in Phase 16. The Linux Netlify build, TypeScript check and scan of 33 browser assets passed. Manual publishing used `.netlify/static` and the generated server functions.

Twelve live HTTP checks passed: homepage, search, privacy, sign-in and health load; signed-out administrator health and private document access return 401; seeded property and landlord links return 404; public scheduled-function invocation returns 403; server build files and environment files return 404. Sign-in contains the updated footer and no early-prototype wording. One five-second health probe timed out; a follow-up returned healthy in about two seconds and the original bounded probe then passed. These checks do not establish email delivery or authenticated acceptance.

Anonymous hosted database reads returned zero properties, landlords and reviews. Both media buckets remain private with a 5 MiB storage ceiling. Hosted intake allows neither fictional nor real submissions; evidence retention remains 90 days. Email confirmation is required. The existing Google provider is configured, but the application Google button remains disabled pending the replacement client configuration and end-to-end acceptance.

Netlify's function metadata confirms a daily cleanup schedule of `0 2 * * *` (07:30 in India). This verifies schedule configuration, not successful scheduled execution. Hosted cleanup execution, monitoring and complete encrypted backup/restore acceptance remain pending.

Google Cloud's notification panel confirms creation of the support-account project `rentcheck-india`, named RentCheck India. Its console repeatedly returned loading errors during setup. OAuth configuration under rentchecksupport@gmail.com is not yet accepted; the support mailbox app-password page still requires the account owner's verification. Existing Netlify/Supabase account ownership has not been transferred. No credentials were committed or printed.

## How to check

1. Open the hosted site and Explore. No fictional listings or reviews should appear.
2. Open `/sign-in`: the footer should say “Accommodation research across India.” Google sign-in is not enabled yet.
3. Open `/api/health`: expect `{"status":"ok"}`. While signed out, `/api/admin/health` should deny access.
4. Complete the support account's verification directly in the Google App passwords tab inside Codex. Never paste passwords or generated credentials into chat.
5. After the replacement Google client and SMTP are configured, test Google login, alias persistence, logout, ordinary-user administrator denial, email confirmation and password recovery. Real intake stays closed until these checks and the operational checks are accepted.
