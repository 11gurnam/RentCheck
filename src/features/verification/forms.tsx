"use client";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { ActionFeedback, ActionIcon, StatusBadge } from "@/components/ui/action-feedback";
import { requestVerification, decideVerification } from "./actions";
import type { Verification } from "./data";
import { EvidenceUpload, EvidenceLinks } from "@/features/privacy/evidence-upload";
import { EvidenceChecklist } from "@/features/operations/checklist";
import { displayDate } from "@/lib/display-date";
export function VerificationForm({
  review,
  requests,
  real = false,
}: {
  review: string;
  requests: Verification[];
  real?: boolean;
}) {
  const [s, a, p] = useFeedbackAction(requestVerification, {});
  const active = requests.some((r) =>
    ["pending", "approved"].includes(r.status) && r.stage !== "awaiting_information",
  );
  return (
    <section className="dashboard-card">
      <h2>{real ? "Manual tenancy evidence review" : "Demonstration tenant verification"}</h2>
      <p>Read the <a href="/privacy">privacy and evidence retention policy</a> before uploading.</p>
      <p>
        {real ? "Upload redacted utility bills, internet bills, a rent agreement or other evidence supporting this property and tenancy period. Remove bank details, identity numbers and unrelated people's information. Only you and authorized reviewers can access it. Manual review is not independent identity certification." : "Use fictional utility bills, internet bills, rent agreements or other supporting documents only. Demo approval is separate from real tenancy verification."}
      </p>
      {requests.map((r) => (
        <div key={r.id}>
          <p>
            <StatusBadge status={r.status}>{r.stage === "awaiting_information" ? "Awaiting your information" : r.stage === "under_review" ? "Under review" : r.status}</StatusBadge> {r.reason ? "· " + r.reason : ""}
          </p>
          <EvidenceLinks documents={r.documents ?? []} />
        </div>
      ))}
      {!active && (
        <form
          action={a}
          className="auth-form"
          onReset={(e) => e.preventDefault()}
        >
          <input name="review" type="hidden" value={review} />
          {requests.some(r => r.stage === "awaiting_information") && <p className="action-feedback feedback-warning">Upload a complete updated evidence set addressing the administrator’s request. This replaces the current documents for this application; previous evidence remains private until its retention deadline.</p>}
          <EvidenceUpload demo={!real} />
          <label>
            <input type="checkbox" name="synthetic" required /> {real ? "I have permission to submit this redacted document and consent to private review and the evidence retention policy." : "This document contains only invented demonstration information."}
          </label>
          <button disabled={p}><ActionIcon name="save" />{real ? "Request manual evidence review" : "Request demonstration verification"}</button>
        </form>
      )}
      <ActionFeedback receipt={s} message={s.message} status={s.status} />
    </section>
  );
}
export function VerificationDecision({ request }: { request: Verification }) {
  const [s, a, p] = useFeedbackAction(decideVerification, {});
  return (
    <section className="dashboard-card">
      <h2>
        {request.property} · {request.alias}
      </h2>
      <p>{request.is_demo === false ? "Real evidence · manual review" : "Demonstration request"} · <StatusBadge status={request.status} /></p>
      <p>Evidence expires: {request.expires_at ?? "Not recorded"}{request.evidence_expired ? " · Download unavailable" : ""}</p>
      <p>{request.reason}</p><p>{request.address} · Tenancy: {request.start_date ? displayDate(request.start_date) : "Not recorded"} → {request.end_date ? displayDate(request.end_date) : "Current"}</p>
      <EvidenceLinks documents={request.documents ?? []} />
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
          <button disabled={p}><ActionIcon name="save" />Save verification decision</button>
        </form>
      )}
      <ActionFeedback receipt={s} message={s.message} status={s.status} />
    </section>
  );
}
