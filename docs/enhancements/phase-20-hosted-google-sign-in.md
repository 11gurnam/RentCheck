# Phase 20 — hosted Google sign-in

Google OAuth was configured on 12 October 2026 in RentCheck India under rentchecksupport@gmail.com. The owner created a separate hosted Web application credential. Its origin is https://rentcheck-india.netlify.app and its exact Supabase callback is https://qbvuwjyamktzwimisvet.supabase.co/auth/v1/callback. Local Google credentials and the local backend remain separate.

The owner authorized private local storage and hosted provider configuration. The ignored .env.google.hosted.local file is included in the staged-secret scanner; neither the credential nor the generated browser artifacts belong in Git. A live Supabase authorization request returned HTTP 302 to Google using the new client and exact callback.

Branding links use the actual homepage and /privacy page, and both support/developer contacts use the project mailbox. No nonexistent terms URL or logo was submitted. The owner approved only openid, userinfo.email and userinfo.profile scopes and public OAuth publishing. The console confirms In production; all three basic scopes persist after reload, with no sensitive or restricted scopes configured.

## Acceptance status

- Netlify production build passed and deploy 6accab3ce914ca380b026254 is live. The production Google feature flag is enabled.
- 35 account validation/deployment tests passed; script ESLint and whitespace checks passed. All 33 browser assets passed the private-value scan.
- Six hosted HTTP checks passed: health/privacy/sign-in 200, anonymous administrator access 401, fictional fixture property 404 and the private Google env path 404.
- The live Google button reaches the new client’s consent screen using the support identity. Owner consent and authenticated alias/logout acceptance are still pending.
- Real contribution intake remains closed pending the launch checks documented in Phase 19. Publishing the OAuth audience does not enable rental intake or grant administrator access.

## How to check

1. Open https://rentcheck-india.netlify.app/sign-in and choose Continue with Google after the enabled deployment is published.
2. Choose your Google account and review the basic sign-in permissions. Expect /account after approval.
3. Save a public alias, refresh, sign out and sign in with Google again. Verify the alias remains and an ordinary account still shows Administrator access: Not granted.
