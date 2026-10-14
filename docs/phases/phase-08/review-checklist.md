# Final RentCheck walkthrough — no tech knowledge needed

Open http://127.0.0.1:3000 after I say the preview is ready. Keep Docker Desktop running. This is on YOUR computer. Use this chat's local-demo-accounts.md for fictional renter/renter2/renter3/claimant/admin accounts, and fictional-rental-document.png for document/photo examples. Keep admin in an incognito/separate browser window; don't give your Google account admin access. Never enter real rental documents.

You can review in short sections; no terminal commands or code reading required. All prototype approvals are demonstrations.

## Public website and your account
1. Open the introduction: expect India-wide RentCheck, no booking/payment or vacancy promises. Narrow the window and press Tab: everything should fit; Skip to content should take you to the page content.
2. Explore: search Demo Neem Courtyard. Try state Delhi, city New Delhi, locality Central Park, type Flat and a rent range including ₹18,000–₹26,000. Expect Neem. Reset filters; examples from multiple Indian cities return. Nonsense searches give a useful empty state.
3. Open Neem: current Demo North Homes and historic Demo Previous Management appear with dated history. Ratings for place and manager are separate. Open either landlord profile, click Review this landlord, then Review your tenancy at Demo Neem Courtyard. Sign-in should preserve the selected place. In the review form, use Landlord / management rating; tenancy dates determine which recorded landlord receives it. Unrated examples say no ratings rather than zero.
4. Sign in with Google. On Your account choose a public alias, Save alias, refresh, sign out and sign in again. Expect the alias stays and Administrator access Not granted. You already confirmed these checks; repeat only if reviewing the final version.
5. Save a property to shortlist. Refresh/sign out/back in: expect it stays for that account. A different fictional account should have its own shortlist.

## Fictional contributions and tenant reviews
6. As fictional renter, Add a place with a unique name (example Demo Final Walkthrough08), fictional address, Delhi / Final Demo City / Test Area, Flat, rents ₹1,000 and ₹2,000. Confirm invented data; do not mark as owned for this tenant example. If duplicates appear, inspect them and acknowledge only a distinct fictional place. Expect published profile searchable by name. Reusing an exact address is refused.
7. Write a review: former tenancy 2025-01-01 to 2025-12-01, rent ₹1,500, property rating 4, management unanswered if none recorded, text “This is a fictional tenancy example for the final walkthrough.” Confirm fictional review. Expect Your reviews then visible Unverified tenant public text.
8. Edit review and photos. Change text/rating, save, refresh: expect Updated and persistence. Add the supplied fictional PNG image as a photo: expect it visible on the public profile. Start date stays fixed. Repeating the same tenancy must not create another review; overlapping dates are refused/flagged.
9. Use a DIFFERENT fictional property for deletion. Delete its review from Your reviews after confirmation: expect deleted, absent from public feed/ratings and its photo unavailable. Deleted/removed records are not republished. Archived merge losers remain read-only.
10. If a property has more than 20 experiences, use Next/Previous experiences page; older text remains accessible while the displayed overall rating/count covers all eligible reviews.

## Demonstration verification
11. On your edit page, upload fictional-rental-document.png under Fictional rental document image, confirm invented information, request verification. Expect pending and your private download; another account/incognito cannot download that same link.
12. As fictional admin, /admin/verification: inspect evidence, enter a reason, approve. Expect Demonstration verified tenant on public review, with no private document/gender answer exposed.
13. To check women's threshold, use renter/renter2/renter3 on the SAME new fictional property, each with its own review and explicit fictional woman's identity + Yes recommendation. Request/approve each. Expect counts 1/1 and 2/2 without recommendation, then 3/3 with recommendation. Revoke ONE approval: expect 2/2 and badge/filter removal. The platform does not guarantee safety.

## Representative claims and reports
14. As claimant, claim a profile on which claimant has written NO tenant review. Upload fictional evidence and confirm invented claim. Your claims should show pending with no editor/reply controls.
15. Admin /admin/claims: inspect the evidence, approve with a reason. Claimant refreshes Your claims, changes allowed name/description/rent (property) or name/description (manager), enters a reason and saves. Expect persistent permitted changes; no tenant edit/delete controls.
16. Claimant writes a representative reply below a matching tenant review. Expect separately labelled response and unchanged tenant text. Admin revokes claim: expect reply hidden and controls gone. Historic manager claims reply only to reviews recorded under that manager.
17. Report a visible review with a reason: it remains visible pending investigation. Admin /admin/reports keeps/removes with a reason; removal excludes text/photos/replies/rating/recommendation. An ordinary account opening ANY admin page sees Access restricted.

## Admin history, duplicates and retained audit
18. Follow the [Phase 7 merge checklist](https://github.com/11gurnam/RentCheck/blob/phase-07-moderation/docs/phases/phase-07/review-checklist.md) for TWO new same-city fictional properties with identical renter/start-date reviews. A merge without explicit losing-tenancy/claim resolutions must refuse and preserve both profiles/saves; resolved merge retains the chosen record on target, archives source and deduplicates saves.
19. /admin/associations adds valid nonoverlapping periods or explicitly replaces one. Existing tenant reviews keep their old manager/rating. Add only invented managers; exact duplicate names are refused.
20. /admin/audit shows decisions/reasons. Filter by the record ID from a property/review/claim URL or action; Next audit page reaches older records. Previous/new values are expandable. Ordinary account access is denied.
21. Open an invalid profile address such as /properties/not-a-profile. Expect helpful 404 and Explore link. If a real service error appears, Try again should recover after the service returns; no database details should be shown. Automated recovery already tests this without asking you to stop Docker.

## How to report your result
Say “step 7 works” or “step 7 does not work”, with page/action/expected/actual and a screenshot without passwords/private links. Tell me if wording is confusing or anything is clipped. Your manual review is recorded separately from my automated checks.

The complete code is on phase-08-release in GitHub. Nothing is merged to main or publicly hosted by this task. Hosting requires the separate prepared deployment guide and your hosting/provider account choices. Manual status: NOT RUN until you report results.
