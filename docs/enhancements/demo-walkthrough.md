# RentCheck local demo walkthrough

Open `http://127.0.0.1:3000`. Keep Docker Desktop running. The app covers India; the current catalogue and approvals are fictional examples. Use separate browser profiles or sign out between tenant, landlord and administrator demonstrations. The private local demo account list is supplied in the Codex task outputs; credentials are deliberately absent from this repository.

## Tenant — about five minutes

1. Search by city/locality and adjust filters. Open a property and show its ratings, tenant reviews, management history and landlord profile. Save it to your private shortlist and refresh to show persistence.
2. Sign in, open a property and choose its review action. Enter the tenancy start date: the form identifies the recorded manager receiving the management rating. If no manager is recorded, that rating remains unavailable.
3. Submit separate property and management ratings with a public comment. Open **Your reviews → Edit review and photos**, upload an image and show its **Shared by tenant** and unverified/verified tenancy labels on the public profile.
4. Request tenancy verification using fictional image/PDF evidence. Show that the document is private. After administrator approval, refresh the public photo/review labels and open **Your account → Notifications** to show the decision.
5. Change your public alias, refresh and show that it persists. Ordinary accounts show **Administrator access: Not granted**.

## Landlord — about five minutes

1. Sign in as the representative demo account. Open the relevant property or manager profile and choose **Claim this profile**. Submit fictional evidence. A claim requires a separate administrator decision.
2. On a property you declared ownership of or have a pending matching claim for, use **Landlord photos → Add landlord photos**. Show **Shared by landlord** with **Unverified landlord**.
3. Approve the matching claim from the administrator account. Return as the landlord: show the verified demonstration label, permitted details editing and separate representative replies to reviews. Replies do not alter the tenant's ratings or comment.
4. Return as the tenant and show the reply notification. Optionally demonstrate reporting a landlord photo and administrator keep/remove decisions. Revoked/rejected claim-only photos become unavailable.

## Administrator — about three minutes

Use the supplied trusted administrator account and open **Administrator area**. Show private verification/claims queues, a reasoned decision, review and landlord-photo reports, and dated audit history. Property management changes preserve history. Duplicate-property merges require explicit conflict resolution. Administrator permission cannot be self-selected by an ordinary user.

## Optional account/privacy demonstration

Use a disposable account to show **Forgot password** and its local email at `http://127.0.0.1:54324`, private PDFs and read notifications. Show the deletion confirmation screen without deleting your normal demo/Google accounts. Full checks: [Phase 10 guide](phase-10-account-privacy.md). Photo checks: [Phase 09 guide](phase-09-photo-provenance.md).

## What to say about remaining work

Phases 09–10 extend the completed original prototype. Private conversations, comparison/maps (Phase 11), real-data operation, operator cleanup retries, backup/restore and monitoring (Phase 12) are deferred at the user's request. Deployment is also deferred. There are no bookings or payments. Current verification labels represent demonstration review decisions, not certified real identity, ownership or tenancy.
