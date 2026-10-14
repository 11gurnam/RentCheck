# Property verification

Tenant verification is attached to a review's property and tenancy period. A tenant can submit a review without evidence. Their account shows an overall verified/unverified status and lists the separate status of each stay. Demo approvals always remain demonstration approvals.

From the review editor, tenants submit up to three private documents: a lease, utility bill, residential internet/service bill, or other supporting evidence accepted by a reviewer. Property claimants search by name or address at `/claims/new`, select the property, and submit ownership or authorization evidence. JPG, PNG, WebP and PDF documents are limited to 3 MiB each. Images are decoded and normalized, metadata is removed, and PDFs pass the existing restricted document worker. Evidence is not sent to the review-language AI service.

An authorized administrator reviews applications at `/admin/verification` and `/admin/claims`. Approval of real evidence requires explicit checks for readability, completeness, validity, the applicant, the property, and the tenancy period or representative authority. These checks record manual evidence review; the system does not automatically authenticate bills or certify legal ownership. The reviewer must explain approval, rejection, revocation or a dispute. Rejected applicants can submit new evidence. Changing tenancy dates revokes existing verification and requires fresh evidence.

Only an approved claim for the specific property authorizes official landlord replies. Manager-profile claims do not authorize replies across properties. Pending, rejected, disputed and revoked claims provide no reply privileges. Replies remain separate from tenant text and disappear from the public feed if claim authority is suspended. Existing tenant review editing/deletion restrictions remain enforced by the backend.

A new claim conflicting with another user's approved property claim is marked disputed. It requires administrator resolution and cannot be approved while the conflicting approval remains. A new application does not automatically suspend an established claim: this prevents an unsubstantiated application from disabling an approved representative. Administrators can separately mark the established claim disputed, immediately suspending its privileges while reviewing the conflict.

Evidence stays in the private `rental-documents` bucket. Only its submitting user and authorized administrators can download it through the authenticated document endpoint. Public pages expose status and uploader identity, never document URLs or evidence contents. Supplemental documents inherit primary-document retention and expiry; expired or missing evidence cannot be approved. Existing retention cleanup and account deletion apply to every document. Decisions, status transitions, disputes and checklist records are audited.

Apply `supabase/migrations/202610130004_property_verification_workflow.sql` before deploying the app changes. It preserves existing approval data and adds supplemental evidence, contextual status queries and property-scoped reply authorization. Existing real-data intake controls remain unchanged.

Validation includes backend tests for privacy, cross-property authorization, disputes, rejection/resubmission, real-evidence checklists and tenancy-date invalidation; a browser test covers upload, administrator approval, claim search, reply and dispute suspension.

## Verification Management

Administrators use `/admin/verification-management` to search, filter, sort and page through tenant and property-claim applications. Summary cards count pending, rejected and disputed applications and distinct applicants with real approved tenancy/property evidence. Demonstration approvals retain their labels and do not inflate real verified-account counts. Existing manager-profile claim tools remain separate.

Application details show the private account identity, property/tenancy context, current evidence, secure image previews, conflicting active claims and audited history. An administrator can assign the application to themselves, request more information, approve/reject, revoke approval, or suspend a property claim as disputed. Decisions require reasons and confirmation; real approval still requires all six manual checks. Both the unified and older approval APIs prevent administrators from approving their own applications.

Information requests notify the applicant privately. The tenant review editor or Your claims page accepts a complete updated evidence set under the same application ID. The current evidence set is replaced, old files remain private until their existing retention deadline, and the change is audited. The application returns to review without receiving a badge or reply privileges. Rejection, approval, revocation and dispute decisions reuse the existing notifications and authorization rules.

Apply `202610130005_verification_management.sql` after the property verification migration.
