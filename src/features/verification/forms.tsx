"use client";
import { useActionState } from "react";
import { requestVerification, decideVerification } from "./actions";
import type { Verification } from "./data";
export function VerificationForm({
  review,
  requests,
}: {
  review: string;
  requests: Verification[];
}) {
  const [s, a, p] = useActionState(requestVerification, {});
  const active = requests.some((r) =>
    ["pending", "approved"].includes(r.status),
  );
  return (
    <section className="dashboard-card">
      <h2>Demonstration tenant verification</h2>
      <p>
        Use fictional rental-document images or PDFs only. This prototype
        simulates verification; it never verifies a real tenancy.
      </p>
      {requests.map((r) => (
        <div key={r.id}>
          <p>
            {r.status} {r.reason ? "· " + r.reason : ""}
          </p>
          <a href={"/api/documents/" + r.document_id}>
            Download your private document
          </a>
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
            Fictional rental document image or PDF
            <input
              type="file"
              name="document"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
            />
          </label>
          <label>
            <input type="checkbox" name="synthetic" required /> This document
            contains only invented demonstration information.
          </label>
          <button disabled={p}>Request demonstration verification</button>
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
      <p>Demonstration request · {request.status}</p>
      <p>{request.reason}</p>
      <p>
        <a href={"/api/documents/" + request.document_id}>
          Download private demonstration document
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
                  <option value="approved">Approve demonstration</option>
                  <option value="rejected">Reject</option>
                </>
              ) : (
                <option value="revoked">Revoke demonstration approval</option>
              )}
            </select>
          </label>
          <label>
            Decision reason
            <textarea name="reason" minLength={10} maxLength={2000} required />
          </label>
          <button disabled={p}>Save verification decision</button>
        </form>
      )}
      {s.message && <p role="status">{s.message}</p>}
    </section>
  );
}
