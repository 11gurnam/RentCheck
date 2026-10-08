"use client";
import { useActionState } from "react";
import {
  requestClaim,
  decideClaim,
  updateDetails,
  replyToReview,
} from "./actions";
import type { Claim } from "./data";
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
  const [s, a, p] = useActionState(requestClaim, {});
  return (
    <form action={a} onReset={(e) => e.preventDefault()} className="auth-form">
      <input name="target" type="hidden" value={target} />
      <input name="kind" type="hidden" value={kind} />
      <p>Read the <a href="/privacy">privacy and evidence retention policy</a> before uploading.</p>
      <p>
        Request {real ? "manual representative review" : "demonstration representative access"} for {name}. Private evidence
        is visible only to you and trusted administrators. Approval grants
        permitted detail/reply controls.
      </p>
      <label>
        {real ? "Redacted representative evidence image or PDF" : "Fictional claim evidence image or PDF"}
        <input
          type="file"
          name="document"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
        />
      </label>
      <label>
        <input name="synthetic" type="checkbox" required /> {real ? "I have authority to submit this redacted evidence and consent to private review and the evidence retention policy." : "This claim and evidence use only invented demonstration information."}
      </label>
      <button disabled={p}>{real ? "Submit representative evidence" : "Submit demonstration claim"}</button>
      {s.message && <p role="status">{s.message}</p>}
    </form>
  );
}
export function ClaimDecision({ claim }: { claim: Claim }) {
  const [s, a, p] = useActionState(decideClaim, {});
  return (
    <section className="dashboard-card">
      <h2>
        {claim.name} · {claim.alias}
      </h2>
      <p>{claim.is_demo === false ? "Real evidence · manual review" : "Demonstration claim"} · {claim.status}</p>
      <p>Evidence expires: {claim.expires_at ?? "Not recorded"}{claim.evidence_expired ? " · Download unavailable" : ""}</p>
      <p>{claim.reason}</p>
      <p>
        <a href={"/api/documents/" + claim.document_id}>
          Download private claim evidence
        </a>
      </p>
      {["pending", "approved"].includes(claim.status) && (
        <form
          action={a}
          className="auth-form"
          onReset={(e) => e.preventDefault()}
        >
          <input type="hidden" name="claim" value={claim.id} />
          <label>
            Claim decision
            <select name="decision">
              {claim.status === "pending" ? (
                <>
                  <option value="approved">{claim.is_demo === false ? "Approve representative evidence" : "Approve demonstration claim"}</option>
                  <option value="rejected">Reject claim</option>
                </>
              ) : (
                <option value="revoked">Revoke claim</option>
              )}
            </select>
          </label>
          <label>
            Claim decision reason
            <textarea name="reason" required minLength={10} maxLength={2000} />
          </label>
          {claim.is_demo === false && <EvidenceChecklist />}
          <button disabled={p}>Save claim decision</button>
        </form>
      )}
      {s.message && <p role="status">{s.message}</p>}
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
  const [s, a, p] = useActionState(updateDetails, {});
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
      <button disabled={p}>Save claimed details</button>
      {s.message && <p role="status">{s.message}</p>}
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
  const [s, a, p] = useActionState(replyToReview, {});
  return (
    <form action={a} className="auth-form" onReset={(e) => e.preventDefault()}>
      <input name="review" type="hidden" value={review} />
      <label>
        Reply as approved representative
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
      <button disabled={p}>Save representative reply</button>
      {s.message && <p role="status">{s.message}</p>}
    </form>
  );
}
