# RentCheck platform administration

Sign in using an account with an existing trusted administrator grant, then open `/admin`. The account page links to the administrator workspace. A public alias or a claimed landlord role never grants administrator access.

## Management pages

- **Overview:** live counts, six calendar months of activity, verification coverage, application statuses, city distribution, and applications pending for more than seven days. Counts link to filtered queues.
- **Properties:** search, city/status/claim/rating/date filters, paging, private inspection of photos and verification history, suspension/reactivation, and suspicious-listing reports.
- **Users:** account roles, email, verification, review and claim counts, associated properties and stays, suspension/reactivation, and restricted internal notes.
- **Tenant / Landlord Verification:** separate queues sharing a secure evidence viewer, multiple-document selection, image zoom, PDF viewing/download, reviewer assignment to self, additional-information requests, an evidence checklist, reasoned decisions, disputes, and revocation.
- **Reviews & Moderation:** content, property, author, rating, verification, photo viewer, report counts, and separate landlord responses. Temporary hiding is reversible. Author deletion and permanent removal cannot be restored. Landlord responses can be removed independently with an audit record and author notification. Negative feedback alone is not grounds for removal.
- **Disputes & Reports:** listing flags, conflicting claims, tenant evidence disputes and appeals. Administrators can assign, request clarification, escalate, or resolve with a reason. Verification disputes require an evidence decision before their case can be closed.
- **Activity & Audit Logs:** searchable immutable actions with administrator, record, reason, date, and before/after state. Existing duplicate, photo/report, management-history and operations tools remain available.

Users can report a property from its details page. `/account/appeals` lets users select their own review, verification or property claim, submit an appeal, follow its status, and respond to clarification requests. Private administrator notes are never included in applicant-facing responses. Decision reasons can be shared with the affected account; keep confidential investigation details in internal notes.

## Counting and verification rules

RentCheck currently gives every registered account tenant capabilities. The dashboard counts those accounts as tenants. A landlord role is recorded when an account first submits a property claim; its registration trend uses that first-claim date. Roles can overlap.

Verified tenant/landlord metrics count distinct accounts with approved **real** evidence. Verified property claims are counted separately. Demonstration approvals retain their demonstration labels and do not increase real verification totals. Property verification reflects that property's approved claim, rather than a landlord's claim elsewhere.

Pending workload includes applications under review or awaiting information. The application status filter can further distinguish these stages. Report trends count report submissions, while the flagged-review card counts distinct reviews with unresolved reports. These are different measures.

Evidence validation checks file format, size, availability and decoding. No OCR, external identity certification or automatic authenticity determination is provided. The reviewer must inspect the address, dates, consistency and the applicant's connection to the property. A utility bill does not need to carry the tenant's name when other evidence supports residence.

## Authorization and deployment

Apply migrations `202610130004_admin_platform.sql`, `202610130005_admin_review_support.sql`, and `202610130006_admin_integrity.sql` before deploying this frontend. They build on the existing verification and moderation migrations. They have been applied to the local development database; hosted environments require their own migration deployment.

Admin RPCs enforce the existing trusted grant and active-account status in the database. Mutation operations validate targets, require reasons, serialize catalogue decisions, and save immutable audit records. Private documents and photos are served through authorized routes with private, noncached responses. Document access is audited. Suspended sessions are blocked from normal platform mutations, including direct calls to existing business RPCs; public browsing remains available.

Administrator grants stay under the existing trusted database/operator process. This dashboard does not allow ordinary accounts to elevate themselves or administrators to suspend one another. No default credentials or service keys are added to source control.

Verification changes notify applicants and update existing property-specific badges and permissions. Internal notes remain restricted to administrators. The existing cleanup and evidence retention process still applies.

## Verification

`tests/integration/admin-platform.test.ts` exercises authorization, real backend metrics, hiding/restoration/removal, private notes, suspension, listing visibility, appeals and clarification, verification disputes, document-access audit, and audit immutability. Existing real-evidence, tenant/landlord verification and moderation integration suites cover approvals and permissions.

`tests/browser/admin-platform.spec.ts` covers the dashboard, listing controls, confirmation dialogs, private notes, navigation, mobile overflow and accessibility. The existing verification-management and property-trust browser suites exercise evidence uploads, private previews, information requests, approvals, badges and landlord replies.
