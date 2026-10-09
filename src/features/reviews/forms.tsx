"use client";
import { useActionState, useState, useRef, useId } from "react";
import { submitReview, removeReview, closeTenancy } from "./actions";
import type { OwnReview } from "./validation";
import { CriteriaForm } from "./criteria-form";
export function ReviewForm({
  property,
  review,
}: {
  property: { id: string; name: string; property_type: string };
  review?: OwnReview;
}) {
  const [state, action, pending] = useActionState(submitReview, {});
  const [current, setCurrent] = useState(review?.current ?? true);
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="auth-form tenancy-review-form"
    >
      <input type="hidden" name="property" value={property.id} />
      {review && <input type="hidden" name="review" value={review.id} />}
      <p className="review-property-context"><strong>{property.name}</strong><span>{property.property_type} · Your public alias appears with this review.</span></p>
      <fieldset className="review-stay-fields"><legend>Your stay</legend>
      <div className="review-short-fields">
      <label>
        Tenancy status
        <select
          name="current"
          value={String(current)}
          onChange={(e) => setCurrent(e.target.value === "true")}
        >
          <option value="true">Current tenant</option>
          <option value="false">Former tenant</option>
        </select>
      </label>
      <label>
        Monthly rent paid (INR)
        <input name="paid" type="number" min="0" max="10000000" required defaultValue={review?.paid} />
      </label>
      </div>
      <div className="review-date-fields">
      <label>
        Tenancy start
        <input name="start" type="date" required defaultValue={review?.start} readOnly={!!review} />
      </label>
      <label>
        Tenancy end
        <input
          name="end"
          type="date"
          required={!current}
          disabled={current}
          defaultValue={review?.end ?? ""}
        />
      </label>
      </div>
      {current && <p className="field-hint">Your stay is ongoing. No end date needed.</p>}
      {current && <input name="end" type="hidden" value="" />}
      </fieldset>
      <CriteriaForm type={property.property_type} initial={review?.criteria} />
      <div className="review-short-fields"><label>
        Landlord / management rating
        <select name="managerRating" defaultValue={review?.managerRating ?? ""}>
          <option value="">N/A</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </label>
      <label>Would you recommend this place? (optional)<select name="recommend" defaultValue={review?.recommend == null ? "" : String(review.recommend)}><option value="">N/A</option><option value="true">Yes</option><option value="false">No</option></select></label>
      </div>
      <p className="field-hint">Management rating is optional; select N/A if the manager is unknown.</p>
      <label>
        Your experience
        <textarea
          name="body"
          minLength={10}
          maxLength={5000}
          required
          defaultValue={review?.body}
          rows={4}
          placeholder="What worked well? What could be better?"
        />
      </label>
      <label>
        <input name="woman" type="checkbox" defaultChecked={review?.woman} /> I
        explicitly self-identify as a woman (optional, private answer).
      </label>
      <label>
        <input name="synthetic" type="checkbox" required /> This is a fictional
        tenancy and review.
      </label>
      {state.message && <p role="alert">{state.message}</p>}
      <button className="primary-button" disabled={pending}>
        {pending ? "Saving…" : review ? "Save review" : "Publish review"}
      </button>
    </form>
  );
}
export function DeleteReview({ id }: { id: string }) {
  const [s, a, p] = useActionState(removeReview, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  return (
    <>
      <button type="button" className="review-action review-delete" onClick={() => dialog.current?.showModal()}>Delete review</button>
      <dialog ref={dialog} className="review-delete-dialog" aria-labelledby={title} onCancel={e => { if (p) e.preventDefault(); }}>
        <h2 id={title}>Delete this review?</h2>
        <p>Your review and its ratings will be removed from public view. This review cannot be republished.</p>
        <form action={a}>
          <input type="hidden" name="review" value={id} />
          {s.message && <p role="status">{s.message}</p>}
          <div className="review-actions">
            <button type="button" className="review-action" autoFocus disabled={p} onClick={() => dialog.current?.close()}>Cancel</button>
            <button className="review-action review-delete" disabled={p}>{p ? "Deleting…" : "Confirm delete"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
export function CloseTenancy({ review }: { review: OwnReview }) {
  const [s, a, p] = useActionState(closeTenancy, {});
  return (
    <form action={a} className="auth-form">
      <input type="hidden" name="review" value={review.id} />
      <p>
        This deleted or removed review cannot be republished. You can end its
        tenancy to record a later distinct stay.
      </p>
      <label>
        Tenancy end
        <input
          name="end"
          type="date"
          required
          defaultValue={review.end ?? ""}
        />
      </label>
      <label>
        Monthly rent paid (INR)
        <input name="paid" type="number" required defaultValue={review.paid} />
      </label>
      <button disabled={p}>Save tenancy end</button>
      {s.message && <p role="status">{s.message}</p>}
    </form>
  );
}
