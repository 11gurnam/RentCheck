# Phase 11 — private contact, comparison and locations

Approved representatives can opt in to contact under **Your account → Private conversations**. A tenant starts from a property profile and separately confirms private contact. Only the two participants can list/read the conversation; administrators can inspect individual reported messages only. Contact is checked on every send against current approved claims and management dates. Either participant can block their conversation, and only the blocker can undo their block. Opt-out, claim revocation or a hidden/merged property pauses new messages. Existing history stays available. Messages are plain text, up to 2,000 characters, with serialized limits of ten per minute and 100 per day per sender. Starting new conversations is limited to five per hour. The history shows 50 messages per page; refresh to receive updates. This phase does not include live push or email alerts.

Deleting either participant's account erases the entire conversation and its private reports. Generic notifications contain no message body. Moderation decisions remain in the immutable audit. Reported removed messages display a placeholder to participants; administrators retain the reported body until account closure.

**Compare properties** is available from search cards and your shortlist. Select up to three published profiles to compare rent, location/type, property ratings, current manager and women's recommendation counts. Unknown data is labelled rather than estimated. The selector currently lists the first 100 profiles; it does not persist selections.

**Recorded locations** shows up to 100 properties with explicitly recorded coordinates. Trusted administrators maintain pins under **Administrator area → Property locations**, with coordinate source, precision and audit reason. Coordinates are bounded to India's surrounding geographic extent; that check does not prove the point is inside India's borders. Exact positions become public. The app does not infer coordinates from addresses. Loading a map requires an explicit click before contacting OpenStreetMap. A pin marked approximate describes an area, not an exact building. No coordinates are invented for the seeded properties.

## How to check

1. As an approved landlord/representative, open **Your account → Private conversations**, check the contact preference and save. As a tenant in a separate browser profile, open the matching property, consent and choose **Start conversation**.
2. Send a message in each direction. Refresh the other browser: the message should appear. The recipient also gets a generic in-app notification. Text such as `<script>` must remain visible text.
3. Block the conversation as tenant. Refresh as landlord: sending should be paused. Unblock as tenant and refresh to resume. Then disable the landlord's contact preference: sending pauses again. Revoking the claim must also stop sending.
4. Report a received message with a reason. As administrator, open **Message reports**, record a decision reason and remove it. Participants should see the removal placeholder. An unrelated account must not see the conversation, even with its URL.
5. Open **Compare properties**, select three and check that a fourth is disabled. Deselect one and choose another. Narrow the browser: the comparison should stack without sideways scrolling.
6. As administrator, enter coordinates from a checked source for a fictional test profile. Open **Recorded locations**, select it and confirm the precision label. Before **Load OpenStreetMap**, no external map iframe is loaded. Clear its coordinates to remove it from the list. Do not enter genuine exact positions for fictional catalogue records.

Automated fixtures use unique invented profiles and remove them after checks. Test results and commit details are recorded in the enhancement plan. The map provider is mocked in browser automation, so live external map availability is a separate manual check.
