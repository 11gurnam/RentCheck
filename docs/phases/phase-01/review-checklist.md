# Phase 1 — what you should check

No coding knowledge needed. These steps use the local test backend; the `.test` emails do not deliver to real people. I will tell you when the preview is ready. Google is checked separately once its setup is complete.

## 1. India-wide introduction
Open [RentCheck](http://127.0.0.1:3000). Expect **India**, accommodation across India and no Jaipur-only wording. Click **Sign in**; expect the account screen. Check the narrow window too: no sideways scrolling, cut-off labels or crowded buttons.

## 2. Create a test account and confirm it
1. On Sign in, click **Create account**.
2. Enter public alias **ReviewTenantOne**, email **reviewer-one@example.test**, password **ReviewDemo!2026Pass**, and repeat that password. These are synthetic test details; do not reuse a real password.
3. Click **Create account**. Expect “Check your email.”
4. Open the [local test inbox](http://127.0.0.1:54324). This is the inbox for this computer's demo emails. Find the message addressed to reviewer-one@example.test. Click **Confirm email** in the message.
5. Expect **Your account**, the chosen alias and your test email. That email appears only in your own private account page.
6. If the email was already registered on a previous test, use Sign in with the same test details instead. If you forget the demo password, tell me; I can reset only this synthetic local account.

## 3. Invalid inputs
On Create account, submit empty fields. Expect helpful field messages. Try alias **a**, email **wrong**, password **short**, and mismatching confirmation. Expect validation errors, no account created and no success message. On Sign in, use the wrong password. Expect a sign-in error; no account access.

## 4. Alias and session persistence
Sign in with your test account. Change the public alias to **ReviewTenantUpdated**, click **Save alias**, then refresh. Expect the new alias to stay. Expect a visible success message. This changes the public name only; it should never grant administrator rights.

## 5. Protected access and logout
While signed in, open [review entry](http://127.0.0.1:3000/reviews/new). Expect a message that review writing arrives in Phase 4, with a return link. No actual reviews can be written yet.
Return to Your account and click **Sign out**. Expect confirmation that you were signed out. Open [Your account](http://127.0.0.1:3000/account) or review entry again. Expect the Sign in screen, not private account details.

## 6. Administrator restrictions
Sign in as the ordinary test account and open [Administrator area](http://127.0.0.1:3000/admin). Expect **Access restricted**. There must be no user-controlled switch that grants administrator access. I verify actual trusted grants and database permissions with automated tests; you do not need to change database settings.

## 7. Google (requires setup; do not mark it checked yet)
Follow [provider setup](provider-setup.md) first. Once I say it is configured, click **Continue with Google** and complete the Google sign-in yourself. Expect Your account with a generated **Tenant-...** alias and no administrator grant. Your Google name, photo and email must not become your public alias. Change the generated alias if you want, then sign out and sign in again to verify persistence. Cancel a Google attempt; expect a useful error and no session created by cancellation.

## Report back
For each section: **works**, **does not work**, or **could not check**. For a problem, tell me the page, action and visible result. Do not send passwords, confirmation links or secrets. Also tell me what looks awkward or confusing. Property search, saved lists, reviews, claims and moderation are not part of this phase.
