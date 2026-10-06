# Phase 2 — what to check

Open [RentCheck search](http://127.0.0.1:3000/search). Every result is a synthetic example; none is an available rental offer. No technical knowledge is needed.

1. **Across India:** expect eight examples from several cities. Narrow the browser window: labels/buttons/cards should fit without sideways scrolling.
2. **Search:** enter **Neem**, click **Apply filters**. Expect **Demo Neem Courtyard**. Try **Demo Previous**: the same property appears because historical managers are searchable.
3. **Combined filters:** click **Reset**. Choose **Mumbai**, type **PG**, maximum rent **12000**, then Apply filters. Expect **Demo Sea Breeze PG**. Refresh the browser: the selected filters and result remain. The rent range overlaps your budget; it is not an availability promise.
4. **City-qualified locality:** Reset, choose **Jaipur**, Apply filters, then choose **Central Park** and apply again. Expect **Demo Rose Studio**, not the New Delhi example that has the same locality name.
5. **No results:** search **nothingmatches**. Expect a helpful empty message and **View all examples**. Clicking it restores the examples.
6. **Property profile:** open **Demo Neem Courtyard**. Expect its location, INR range, current **Demo North Homes** manager and history for **Demo Previous Management** ending 2025-01-01. Ratings are honestly empty.
7. **Manager profile:** click **Demo Previous Management**. Its dated association remains linked to Neem Courtyard; it must not pretend to be the current manager.
8. **Account regression:** sign in, check your alias is still saved, and sign out. Your Google account/provider settings have not been reset.

Report **works**, **does not work**, or **could not check**, and the page/action/result. Keep passwords and secrets private. Phase 3 adds persistent saves and property contributions; there are no unfinished save/add buttons in this phase.
