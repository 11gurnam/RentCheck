"use client";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { SuccessNotice } from "@/components/ui/success-notice";
import { ActionModal } from "@/components/ui/action-modal";
import { ActionFeedback, ActionIcon, StatusBadge } from "@/components/ui/action-feedback";
import {
  requestClaim,
  decideClaim,
  updateDetails,
  replyToReview,
} from "./actions";
import type { Claim } from "./data";
import { EvidenceUpload, EvidenceLinks } from "@/features/privacy/evidence-upload";
import { EvidenceChecklist } from "@/features/operations/checklist";
export function ClaimForm({
  target,
  kind,
  name,
  real = false,
}: {
  target: string;
  kind: "property" | "landlord";
  name: string;
  real?: boolean;
}) {
  const [s, a, p] = useFeedbackAction(async (previous: Parameters<typeof requestClaim>[0], form:FormData) => {
    try { return await requestClaim(previous, form); }
    catch { return {status:"error" as const,message:"Your claim could not be submitted. Check your connection and try again. Your selected documents are still available."}; }
  }, {});
  if(s.status==="success")return <div className="claim-confirmation"><h2><ActionIcon name="check"/>Claim submitted</h2><p>Your documents will be reviewed privately. You can track the decision from Your claims.</p><div className="review-actions"><a className="review-action" href="/claims">View Your claims</a>{kind==="property"&&<a className="review-action" href="/account/contact">Add contact details</a>}</div><SuccessNotice message={s.message??"Claim submitted"} receipt={s}/></div>;
  return (
    <form action={a} onReset={(e) => e.preventDefault()} className="auth-form">
      <input name="target" type="hidden" value={target} />
      <input name="kind" type="hidden" value={kind} />
      <p>Read the <a href="/privacy">privacy and evidence retention policy</a> before uploading.</p>
      <p>
        Request {real ? "manual representative review" : "demonstration representative access"} for {name}. Private evidence
        is visible only to you and trusted administrators. Approval grants
        permitted detail controls. Only an approved claim for this specific property permits official replies; a manager-profile claim alone does not.
      </p>
      <EvidenceUpload claim demo={!real} />
      <label>
        <input name="synthetic" type="checkbox" required /> {real ? "I have authority to submit this redacted evidence and consent to private review and the evidence retention policy." : "This claim and evidence use only invented demonstration information."}
      </label>
      <button disabled={p}><ActionIcon name="save" />{p ? "Submitting claim…" : real ? "Submit representative evidence" : "Submit demonstration claim"}</button>
      <ActionFeedback receipt={s} message={s.message} status={s.status} />
    </form>
  );
}
export function ClaimDecision({ claim }: { claim: Claim }) {
  const [s, a, p] = useFeedbackAction(decideClaim, {});
  return (
    <section className="dashboard-card">
      <h2>
        {claim.name} · {claim.alias}
      </h2>
      <p>{claim.is_demo === false ? "Real evidence · manual review" : "Demonstration claim"} · <StatusBadge status={claim.status} /></p>
      <p>Evidence expires: {claim.expires_at ?? "Not recorded"}{claim.evidence_expired ? " · Download unavailable" : ""}</p>
      <p>{claim.reason}</p><p>{claim.address}</p>
      <EvidenceLinks documents={claim.documents ?? []} />
      {["pending", "approved", "disputed"].includes(claim.status) && (
        <form
          action={a}
          className="auth-form"
          onReset={(e) => e.preventDefault()}
        >
          <input type="hidden" name="claim" value={claim.id} />
          <label>
            Claim decision
            <select name="decision">
              {claim.status !== "approved" ? (
                <>
                  <option value="approved">{claim.is_demo === false ? "Approve representative evidence" : "Approve demonstration claim"}</option>
                  <option value="rejected">Reject claim / resolve dispute</option>
                </>
              ) : (
                <><option value="revoked">Revoke claim</option><option value="disputed">Dispute claim (suspend privileges)</option></>
              )}
            </select>
          </label>
          <label>
            Claim decision reason
            <textarea name="reason" required minLength={10} maxLength={2000} />
          </label>
          {claim.is_demo === false && <EvidenceChecklist />}
          <button disabled={p}><ActionIcon name="save" />Save claim decision</button>
        </form>
      )}
      <ActionFeedback receipt={s} message={s.message} status={s.status} />
    </section>
  );
}
export function DetailsForm({
  claim,
  profile,
}: {
  claim: Claim;
  profile: {
    name: string;
    description: string;
    rent_min?: number;
    rent_max?: number;
  };
}) {
  const [s, a, p] = useFeedbackAction(updateDetails, {});
  return (
    <form action={a} className="auth-form" onReset={(e) => e.preventDefault()}>
      <input name="claim" type="hidden" value={claim.id} />
      <label>
        Profile name
        <input
          name="name"
          required
          minLength={3}
          maxLength={120}
          defaultValue={profile.name}
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          maxLength={3000}
          defaultValue={profile.description}
        />
      </label>
      {claim.property_id && (
        <>
          <label>
            Minimum monthly rent (INR)
            <input
              type="number"
              name="min"
              min="0"
              max="10000000"
              defaultValue={profile.rent_min}
              required
            />
          </label>
          <label>
            Maximum monthly rent (INR)
            <input
              type="number"
              name="max"
              min="0"
              max="10000000"
              defaultValue={profile.rent_max}
              required
            />
          </label>
        </>
      )}
      <p>
        Addresses, associations and tenant reviews are outside these
        representative controls.
      </p>
      <label>
        Change reason
        <textarea name="reason" required minLength={10} maxLength={2000} />
      </label>
      <button disabled={p}><ActionIcon name="save" />Save claimed details</button>
      <ActionFeedback receipt={s} message={s.message} status={s.status} />
    </form>
  );
}
export function ReplyForm({
  review,
  claims,
}: {
  review: string;
  claims: Claim[];
}) {
  const [s, a, p] = useFeedbackAction(replyToReview, {});
  return (
    <ActionModal title="Reply to this review" trigger="Reply to review"><form action={a} className="auth-form" onReset={(e) => e.preventDefault()}>
      <input name="review" type="hidden" value={review} />
      <label>
        Reply as verified property representative
        <select name="claim">
          {claims.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Your public representative reply
        <textarea name="body" minLength={10} maxLength={3000} required />
      </label>
      <button disabled={p}><ActionIcon name="save" />Save representative reply</button>
      <ActionFeedback receipt={s} message={s.message} status={s.status} />
    </form></ActionModal>
  );
}
