# How to review RentCheck — no technology experience needed

You do not need to understand the code. Your review is about what the website does and how it feels to use. I run the technical checks and report their results separately.

## Opening the website
When I say the preview is ready, open [RentCheck on this computer](http://127.0.0.1:3000). Keep the computer and preview running. This address is local to your computer, not a published website. If it says it cannot connect, tell me “please start the preview”; nothing is wrong with your account.

For a phone-sized view, make the browser window narrow or use the phone preview I provide. Real phone testing will need a separately accessible preview later; a phone cannot reach your computer through its own `127.0.0.1` address.

## What to tell me
For each check, write **works**, **does not work**, or **could not check**. For a problem, tell me which page, what you clicked/typed, and what appeared. Never send a password, confirmation link, private token or secret key. Tell me if text is confusing, crowded, clipped or too small. Your review does not replace the automated security checks.

## Phase 0: introduction (now India-wide)
1. Open the website. Expect RentCheck and India in the header, plus “A little more clarity before you move.”
2. Click **Get to know RentCheck**. Expect the “Know a little more” section to appear.
3. Click **Our principles**. Expect privacy and the explanation that recommendations are not a safety guarantee.
4. Make the window narrow. Expect everything to fit without sideways scrolling.
5. Press Tab on the keyboard. Expect a visible focus outline and a **Skip to content** link. Press Enter on that link; it should take you to the main content.
6. Confirm there are no made-up live statistics, available properties, booking or payment actions.

## Phase 1: accounts
Use the [Phase 1 checklist](phases/phase-01/review-checklist.md). I will tell you which checks are ready and which need external setup. Do not assume a sign-in works just because its screen looks finished.

## Every later phase
Each phase will include a separate `review-checklist.md` linked from its README and my delivery message. It will list exact pages/actions, a small example, expected outcomes and things that are not ready. No need to run commands or read test code for your review. We stop after each phase so you can request changes before the next one starts.
