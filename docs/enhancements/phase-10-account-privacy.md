# Phase 10 — recovery, private evidence and account privacy

Password recovery sends a real local Supabase email with a one-use link. Password changes and account deletion require identity confirmation within ten minutes. Recovery responses do not reveal whether an email is registered. Changing a password signs out other sessions.

Evidence uploads accept JPEG/PNG/WebP images and flat PDFs up to 5 MiB. Images are rewritten as JPEG. PDFs are parsed in a bounded worker, rewritten without author metadata or page annotations, and limited to 30 pages. Encrypted, malformed, interactive-form, attached-file and active-action PDFs are rejected. This is file validation, not antivirus scanning or independent document certification. Evidence remains private to its owner and authorized administrators; public profiles never display evidence links.

Private notifications cover verification/claim decisions, representative replies and moderation decisions. Only the recipient can read or mark their notifications as read. This phase provides in-app notifications; it does not provide email alerts or private conversations.

Deleting an account removes its alias, reviews, tenancies, replies, claims, evidence and registered uploaded photos. Published catalogue facts and previous moderation audit records remain. Downloads become unavailable immediately. Registered files are physically removed after closure; storage failures leave durable cleanup jobs. Operator retry/retention workflows are deferred to Phase 12. Use a disposable account for this demonstration: deletion is permanent.

## How to check

1. From **Sign in**, choose **Forgot password**, enter a disposable email account and submit. Open the local inbox at `http://127.0.0.1:54324`, follow its recovery link, enter matching passwords of at least ten characters and update. Sign out: the old password should fail and the new password should work. Reusing the consumed email link should fail.
2. Open **Your account → Change password**. After a fresh sign-in, matching valid passwords should save. After ten minutes, the form should ask you to confirm your identity again.
3. Upload a fictional flat PDF through tenancy verification or a profile claim. Its private download should have the PDF content type and download as an attachment. A signed-out visitor or another ordinary account must not be able to download it. Try a malformed PDF or an interactive PDF: it should be rejected.
4. Approve that request using the separate trusted administrator demo account. Return to the applicant's **Your account → Notifications**. The decision should appear. Select **Mark as read**, refresh and confirm it remains read. A representative reply should also notify the review author.
5. With a disposable account only, open **Your account → Privacy and deletion**. A wrong confirmation must fail. After fresh sign-in, enter `DELETE MY ACCOUNT`, accept the checkbox and submit. The account should close, sign-in should fail and its uploaded media URLs should no longer work. Catalogue facts and moderation history remain.
6. Resize to a phone-sized window: controls and messages should fit without horizontal scrolling.

Automated acceptance and screenshots are recorded in [the enhancement plan](plan.md). Existing Google accounts and configuration were preserved. The current local project still uses fictional records and demonstration approvals; real-user workflows and deployment remain deferred.
