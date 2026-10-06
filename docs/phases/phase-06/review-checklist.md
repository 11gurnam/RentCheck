# Phase 6 — What you should check

Keep Docker running. Open http://127.0.0.1:3000. Use the fictional accounts in local-demo-accounts.md and fictional-rental-document.png from this chat’s outputs; use separate regular/incognito windows for claimant and admin. Your real Google account should remain “Not granted”.

1. As renter, add a uniquely named fictional property (example “Demo Claim Walkthrough 06”), write a fictional tenant review, and copy its profile address. Avoid claiming a property on which the claimant account has written a review.
2. As claimant, open that profile, click “Claim this profile”, choose the fictional document image, check the invented-information box and submit. Open “Your claims”: expect pending and a private download link, with no detail editor.
3. As demo admin, open /admin/claims. Find the matching property/alias, download evidence, enter “Checked fictional evidence for walkthrough” as the reason and save approval. Expect approved. An ordinary account opening this page sees Access restricted.
4. Refresh claimant’s “Your claims”. Change name/description/rent and enter a reason, then save. Refresh the public property: expect those permitted details to persist. Addresses and tenant ratings are outside these controls.
5. On its tenant review, write “This is our fictional representative response” and save representative reply. Expect a separately labelled reply beneath the unchanged tenant text. Refresh to check persistence.
6. As admin revoke the same claim with a reason. Refresh claimant/public profile: expect no editor/reply button and the old reply hidden; tenant text remains.
7. Optional manager check: claim “Demo Previous Management”. After admin approval, replies are available for Neem tenancies starting before2025, rather than current North Homes tenancies. A claim approval involving your own visible tenant review is refused with an explanation.

Report the step, screen, expected versus actual and screenshot without private credentials. These are demonstration permissions, not real ownership verification. You do not need to run terminal commands; automated checks are recorded separately. Manual status: NOT RUN by user.
