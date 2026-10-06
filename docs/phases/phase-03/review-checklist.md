# Phase 3 — what to check

1. Open [search](http://127.0.0.1:3000/search), open **Demo Neem Courtyard**, and click **Save to shortlist**. Sign in if asked. Expect **Remove from shortlist** afterward.
2. Click **Shortlist** in the header. Expect Neem Courtyard. Refresh, then sign out and back in: your save should remain. Click **Remove from shortlist**; expect an empty shortlist if you saved no other places.
3. Open **Add a place** in the header. Use only fictional details. Enter name **Demo Neem Courtyard**, address **Demo Lane 12, Central Park**, state **Delhi**, city **New Delhi**, locality **Central Park**, type **Flat**, rents **10000** and **20000**. Confirm fictional data and click **Add demo property**. Expect an existing-profile link and a same-address message, not a second copy. Typed fields should remain.
4. For a distinct example, change name to **Demo Review Sample**, address **Fictional Test Lane 987**, city **Review Demo City**, locality **Test Park**. Confirm fictional data again and submit. Expect its profile and synthetic label. It should be searchable by name.
5. If similar profiles appear, inspect them first. Only check the distinct-place acknowledgement if it really is a separate fictional example. Uncertain matches are flagged for administrator review, never silently merged.
6. An **I own this fictional example** declaration will prevent reviewing your own place later. It grants no management access; contributing a property also grants none.
7. Sign out and open [Shortlist](http://127.0.0.1:3000/saved) or [Add a place](http://127.0.0.1:3000/properties/new). Expect Sign in, not private data or a working anonymous contribution form.

Say works/does not work/could not check and describe the page/action/result. No commands required. Your review examples stay on this local backend; no real rental details or private identity should be entered. Phase4 adds tenancy/review tools.
