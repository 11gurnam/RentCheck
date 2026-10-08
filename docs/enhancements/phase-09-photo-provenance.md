# Phase 09 — photos and landlord attribution

Tenants add JPEG/PNG/WebP photos from **Your reviews → Edit review and photos**. Public review photos show **Shared by tenant**, the uploader's public alias, and verified/unverified tenancy status. Approved verification upgrades the badge; revocation downgrades it. Hidden/deleted reviews stop serving their images.

Landlords open a property profile and use **Add landlord photos** after declaring ownership when adding a property or submitting a matching claim. A pending claim permits unverified photos. Only a currently approved matching claim grants a verified badge; selecting a role cannot grant it. Rejected/revoked claim-only photos stop appearing and stop downloading. Self-declared owners remain unverified until approval. Images are decoded and rewritten as JPEG to strip metadata, with 5 MiB/20 million pixel limits. Tenants retain their existing three-photo limit per review; landlords have ten per property per uploader, enforced transactionally.

Signed-in users can report landlord photos. Administrators inspect the report queue at **Administrator area → Review reports → Landlord photo reports**, record a reason and keep/remove the image. Removal blocks the download and is audited. Uploader deletion also blocks downloads. Property merges transfer gallery records while preserving blob references. Existing fictional properties explicitly show demonstration labels; this phase does not enable real-document verification.

On a new review, entering the tenancy start date shows the manager who will receive the management rating. Dates use recorded management history, including exclusive end dates. When no manager is recorded, the rating is disabled and remains unanswered. Editing an existing review retains its original manager attribution.

The pulled mobile navigation also now closes on user wheel/touch gestures rather than programmatic scroll events, preventing a menu from closing when keyboard/anchor navigation brings it into view. Escape and outside-click closure remain covered.

## How to check locally

1. Open `http://127.0.0.1:3000`, sign in and open a property. To act as a landlord, choose **Claim this profile**, upload fictional evidence and submit. Return to the property: **Landlord photos → Add landlord photos** is available, with **Unverified landlord** on uploaded images.
2. Use a separate administrator demo account to approve that claim in **Administrator area → Claims**. Refresh the property in the first account; the photo now shows **Shared by landlord** and **Verified landlord**, explicitly marked demonstration on demo properties. Ordinary accounts continue showing **Administrator access: Not granted**.
3. From a tenant account, write a review, enter the start date and confirm the displayed landlord before rating management. Open **Your reviews → Edit review and photos**, upload an image and visit the property. It should show **Shared by tenant → Unverified tenant**. Approving tenancy verification changes its badge.
4. Try a text file renamed `.jpg`: it must be rejected. Remove your uploaded photo and confirm its former URL returns 404. Report a landlord photo, remove it from the administrator report queue, and confirm it also becomes unavailable.
5. Check the page on a narrow phone-sized window. Labels and upload controls should fit without sideways scrolling. Public content should contain aliases rather than email addresses or evidence-document links.

Automated tests create and remove their own fictional fixtures; your Google account is preserved. Screenshots are retained in ignored `test-results` folders. Final test counts and pushed commit are recorded in the enhancement plan.
