# Phase 18 — hosted email delivery

Configured on 12 October 2026 for hosted Supabase project `qbvuwjyamktzwimisvet`. Custom SMTP uses Gmail at `smtp.gmail.com:587`, with sender RentCheck and address rentchecksupport@gmail.com. The app password remains in the ignored `.env.smtp.local` file and is supplied through an environment reference to the private scoped Supabase configuration. No credential belongs in Git or Netlify browser assets.

Gmail SMTP authentication passed over STARTTLS. Supabase accepted the scoped SMTP update and then accepted the confirmation and recovery template updates. The versioned hosted templates have RentCheck branding, the support contact and token-hash links to the hosted application's `/auth/confirm` route. They contain no local prototype or fictional-data wording; local test templates remain separate.

The staged-secret check now includes the private SMTP configuration and both spaced and unspaced password representations. The five staged files passed the secret scan and whitespace check; the changed scanner passed ESLint. The hosted health endpoint returned HTTP 200 and `status: ok`, and public authentication settings still report required email confirmation.

A signup for the owner's support address returned HTTP 200 without a session or confirmed email, showing that email confirmation remains required. Supabase accepted the confirmation email request. Inbox delivery and the confirmation link still require recipient verification; a successful SMTP login or signup response alone does not establish those results. Password-reset delivery and the complete recovery flow are also pending.

The support account was created through the ordinary signup endpoint without administrator privileges or bypassing email confirmation. Its initial generated password is held only in the ignored setup workspace; the owner should choose a private password through the recovery flow after confirmation.

This phase configures the hosted authentication service directly. The existing Netlify release continues serving the application; no new application build is required for these email template changes. The replacement Google OAuth client, provider ownership changes and hosted operational acceptance remain pending. Real rental submissions remain closed.

## How to check

1. Check the rentchecksupport@gmail.com inbox and Spam for “Confirm your RentCheck account.” The sender should be RentCheck from the support address.
2. Click “Confirm email.” Expect the hosted RentCheck account page. Do not share the one-time URL.
3. After confirmation, open `https://rentcheck-india.netlify.app/forgot-password`, enter the support address and click “Send recovery email.” Check for “Reset your RentCheck password.” Its link should open the hosted password form. Choose a private password, then sign out and sign back in.
4. Save a public alias, refresh and confirm it persists. Ordinary account administrator access should read “Not granted.”

Do not mark inbox delivery, confirmation, recovery or public launch acceptance complete until those steps have actually passed.
