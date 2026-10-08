"use client";
import { useActionState } from "react";
import { requestVerification, decideVerification } from "./actions";
import type { Verification } from "./data";
import { EvidenceChecklist } from "@/features/operations/checklist";
export function VerificationForm({
  review,
  requests,
  real = false,
}: {
  review: string;
  requests: Verification[];
  real?: boolean;
}) {
  const [s, a, p] = useActionState(requestVerification, {});
  const active = requests.some((r) =>
    ["pending", "approved"].includes(r.status),
  );
  return (
    <section className="dashboard-card">
      <h2>{real ? "Manual tenancy evidence review" : "Demonstration tenant verification"}</h2>
      <p>Read the <a href="/privacy">privacy and evidence retention policy</a> before uploading.</p>
      <p>
        {real ? "Upload a redacted rental document supporting your tenancy dates and property. Remove bank details, identity numbers and unrelated people's information. Only you and authorized reviewers can access it. Manual review is not independent identity certification." : "Use fictional rental-document images or PDFs only. This prototype simulates verification; it never verifies a real tenancy."}
      </p>
      {requests.map((r) => (
        <div key={r.id}>
          <p>
            {r.status} {r.reason ? "· " + r.reason : ""}
          </p>
          {r.evidence_expired ? <p>Evidence expired; download unavailable.</p> : <a href={"/api/documents/" + r.document_id}>
            Download your private document
          </a>}
        </div>
      ))}
      {!active && (
        <form
          action={a}
          className="auth-form"
          onReset={(e) => e.preventDefault()}
        >
          <input name="review" type="hidden" value={review} />
          <label>
            {real ? "Redacted rental document image or PDF" : "Fictional rental document image or PDF"}
            <input
              type="file"
              name="document"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
            />
          </label>
          <label>
            <input type="checkbox" name="synthetic" required /> {real ? "I have permission to submit this redacted document and consent to private review and the evidence retention policy." : "This document contains only invented demonstration information."}
          </label>
          <button disabled={p}>{real ? "Request manual evidence review" : "Request demonstration verification"}</button>
        </form>
      )}
      {s.message && <p role="status">{s.message}</p>}
    </section>
  );
}
export function VerificationDecision({ request }: { request: Verification }) {
  const [s, a, p] = useActionState(decideVerification, {});
  return (
    <section className="dashboard-card">
      <h2>
        {request.property} · {request.alias}
      </h2>
      <p>{request.is_demo === false ? "Real evidence · manual review" : "Demonstration request"} · {request.status}</p>
      <p>Evidence expires: {request.expires_at ?? "Not recorded"}{request.evidence_expired ? " · Download unavailable" : ""}</p>
      <p>{request.reason}</p>
      <p>
        <a href={"/api/documents/" + request.document_id}>
          {request.is_demo === false ? "Download private evidence" : "Download private demonstration document"}
        </a>
      </p>
      {["pending", "approved"].includes(request.status) && (
        <form
          action={a}
          className="auth-form"
          onReset={(e) => e.preventDefault()}
        >
          <input name="request" type="hidden" value={request.id} />
          <label>
            Verification decision
            <select name="decision">
              {request.status === "pending" ? (
                <>
                  <option value="approved">{request.is_demo === false ? "Approve manual evidence review" : "Approve demonstration"}</option>
                  <option value="rejected">Reject</option>
                </>
              ) : (
                <option value="revoked">{request.is_demo === false ? "Revoke approval" : "Revoke demonstration approval"}</option>
              )}
            </select>
          </label>
          <label>
            Decision reason
            <textarea name="reason" minLength={10} maxLength={2000} required />
          </label>
          {request.is_demo === false && <EvidenceChecklist />}
          <button disabled={p}>Save verification decision</button>
        </form>
      )}
      {s.message && <p role="status">{s.message}</p>}
    </section>
  );
}
