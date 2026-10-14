# RentCheck specification

## Purpose and scope
Help renters research flats, houses, PGs and hostels across India before choosing where to live. Responsive website; tenant experiences, distinct property and landlord ratings, discovery and shortlists. No bookings, vacancy enquiries, payments, leases, AI or rental management. All prototype records and rental documents must be synthetic. India-wide scope replaces the original Jaipur-only scope from Phase 1 onward.

## Accounts and authority
Google and email/password authentication. Public introduction; sign-in required for review experience. One account can be renter and claimant; administrator privilege is independent and assigned through trusted administration, never client input. Public aliases identify reviewers. Private account identity/email and rental documents never enter public responses. Gender is never inferred from names/photos. Only authors edit/delete their reviews; users cannot review their own properties. Approved claimants can update permitted claimed details, reply publicly and report, but never edit/delete tenant reviews. Administrators decide claims/verification, resolve duplicates, investigate reports, maintain associations and record keep/remove reasons.

## Profiles and discovery
Property: name/address, Indian state/union territory, city and locality, type, INR monthly rent range, known current landlord/manager, property rating, reviews, women's recommendation status/counts, save. Landlord: associated properties, distinct management rating and reviews. Preserve dated management history; property reviews stay with property, landlord ratings stay with the landlord responsible for the reviewed tenancy.
Search property name, address and landlord name. Combine state/city/locality, type, rent range, property rating and women's recommendation filters. City-qualified localities prevent mixing neighbourhoods with the same name across cities. State lives in URL; reset and helpful empty results. Renter, landlord and administrator contributions show likely duplicates within city-qualified addresses; uncertain matches require review, never silent merging.

## Reviews and tenancies
One review per tenancy, server validation plus database unique constraint. Current/former status, dates, rent paid, property and landlord five-star ratings, text, optional photos, optional explicit self-identification as a woman, optional recommendation yes/no. Publish immediately as unverified or clearly labelled demonstration verified tenant. Authors edit/delete; edits show Updated. Approved claimants reply; reports leave reviews visible pending decision. Removed/deleted records contribute to neither ratings nor recommendations; no ratings is null, never zero.

Practical duplicate tenancy policy: normalize dates to calendar dates; one tenancy identity per account/property/start date (unique database key), one review per tenancy. Repeated or concurrent submissions use the same canonical tenancy and conflict-safe insertion. Overlapping tenancies for the same account/property are flagged for review; changed dates cannot bypass an existing tenancy silently. Document precise constraints and transaction tests before Phase 4 implementation. This reduces accidental duplicates; aliases/new accounts cannot prove a unique real-world tenancy in a demo.

## Women's recommendations
Count only visible eligible verified tenant responses by explicitly self-identified women who answered yes/no. Exclude unanswered, unverified, deleted and removed reviews. Recommend only when positive >= 3 AND positive * 2 > eligible total. Display positive/total counts. Recalculate on edits, deletion, moderation or verification change. These are tenant recommendations, never a platform safety guarantee.

## Verification, claims and moderation
Private synthetic rental-document uploads and simulated administrator approvals labelled demonstration. Claims require simulated admin approval. Report investigation records decision/reason. Internal audit retains decisions and property-detail changes after public removal. Merges and association changes are transactional, with explicit resolution of saves, claim, association and review conflicts and stable historic landlord attribution.

## Screens and quality
Introduction; sign-in/register; search; property/landlord profiles; add property; create/edit review; saves; account reviews; claimant details/claims/replies; administrator verification/claims/duplicates/reports/associations.
Calm typography, restrained elevation, readable filters/cards, realistic synthetic examples from multiple Indian cities and INR. Phone/tablet/desktop, keyboard/focus/labels/contrast. Relevant loading/empty/error/success/validation states. No fake statistics, safety guarantees, dead buttons or misleading live verification. Omit unfinished actions. Every phase includes a plain-language user review checklist with exact pages, actions and expected results.

## Mandatory acceptance coverage
Auth review access; author ownership; self-review; repeated/concurrent tenancy submissions; distinct ratings; historic attribution; deletion/removal exclusion; women's below-three/exact-three-majority/ties/unanswered/verification changes; pending reports visible; approved claims only; private identity/docs denied; conflict-safe merges; no privilege escalation. Unit rules, isolated DB integration for constraints/policies/transactions/persistence, browser journeys and manual visual/provider checks. Never test destructively against production or represent mocks as live integration.
