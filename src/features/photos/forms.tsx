"use client";
import { useActionState } from "react";
import {
  uploadPropertyPhoto,
  removePropertyPhoto,
  reportPropertyPhoto,
  decidePhotoReport,
} from "./actions";
export function PropertyPhotoForm({
  property,
  own,
}: {
  property: string;
  own: { id: string }[];
}) {
  const [s, a, p] = useActionState(uploadPropertyPhoto, {});
  return (
    <section className="dashboard-card">
      <h3>Add landlord photos</h3>
      <p>
        Up to ten photos per property, 3 MiB each. Only an approved matching
        claim earns a verified label. Pending-claim photos are hidden if the
        claim is rejected or revoked.
        Photos are public. Only upload images you have permission to share; avoid faces and private documents.
      </p>
      <form action={a} className="auth-form">
        <input type="hidden" name="property" value={property} />
        <label>
          Landlord photo
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </label>
        <button disabled={p}>Add landlord photo</button>
        {s.message && <p role="status">{s.message}</p>}
      </form>
      {own.map((ph) => (
        <Remove key={ph.id} photo={ph.id} />
      ))}{" "}
    </section>
  );
}
function Remove({ photo }: { photo: string }) {
  const [s, a, p] = useActionState(removePropertyPhoto, {});
  return (
    <form action={a}>
      <input type="hidden" name="photo" value={photo} />
      <a href={"/api/photos/" + photo}>View your landlord photo</a>
      <button disabled={p}>Remove landlord photo</button>
      {s.message && <p role="status">{s.message}</p>}
    </form>
  );
}
export function PhotoReport({ photo }: { photo: string }) {
  const [s, a, p] = useActionState(reportPropertyPhoto, {});
  return (
    <details>
      <summary>Report this photo</summary>
      <form action={a} className="auth-form">
        <input name="photo" type="hidden" value={photo} />
        <label>
          Photo report reason
          <textarea name="reason" required minLength={10} maxLength={2000} />
        </label>
        <button disabled={p}>Submit photo report</button>
        {s.message && <p role="status">{s.message}</p>}
      </form>
    </details>
  );
}
export type PhotoReportRecord = {
  id: string;
  photo: string;
  property: string;
  reason: string;
  status: string;
  decision_reason: string | null;
};
export function PhotoReportCard({ report: r }: { report: PhotoReportRecord }) {
  const [s, a, p] = useActionState(decidePhotoReport, {});
  return (
    <section className="dashboard-card">
      <h3>{r.property} · photo report</h3>
      <p>{r.reason}</p>
      <p>
        {r.status} · {r.decision_reason}
      </p>
      <a href={"/api/photos/" + r.photo}>Inspect reported photo</a>
      {r.status === "pending" && (
        <form action={a} className="auth-form">
          <input name="report" type="hidden" value={r.id} />
          <label>
            Photo report decision
            <select name="decision">
              <option value="kept">Keep photo</option>
              <option value="removed">Remove photo</option>
            </select>
          </label>
          <label>
            Photo decision reason
            <textarea name="reason" required minLength={10} maxLength={2000} />
          </label>
          <button disabled={p}>Save photo decision</button>
          {s.message && <p role="status">{s.message}</p>}
        </form>
      )}
    </section>
  );
}
