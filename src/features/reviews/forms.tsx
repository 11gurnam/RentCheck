"use client";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
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
      <ActionFeedback message={state.message} status={state.status} />
      <button className="primary-button" disabled={pending}>
        <ActionIcon name="check" />
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
      <button type="button" className="review-action review-delete action-danger" onClick={() => dialog.current?.showModal()}><ActionIcon name="trash" />Delete review</button>
      <dialog ref={dialog} className="review-delete-dialog" aria-labelledby={title} onCancel={e => { if (p) e.preventDefault(); }}>
        <h2 id={title}>Delete this review?</h2>
        <p>Your review and its ratings will be removed from public view. This review cannot be republished.</p>
        <form action={a}>
          <input type="hidden" name="review" value={id} />
          <ActionFeedback message={s.message} status={s.status} />
          <div className="review-actions">
            <button type="button" className="review-action" autoFocus disabled={p} onClick={() => dialog.current?.close()}>Cancel</button>
            <button className="review-action review-delete action-danger" disabled={p}><ActionIcon name="trash" />{p ? "Deleting…" : "Confirm delete"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
export function CloseTenancy({ review }: { review: OwnReview }) {
  const [s, a, p] = useActionState(closeTenancy, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  return (
    <>
      <div className="inactive-review-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v1"/></svg>
        <p>This review is no longer public.{!review.end && <span> Still staying here? No action needed. Moved out? Record the date.</span>}</p>
        <button type="button" className="review-action" onClick={() => dialog.current?.showModal()}>{review.end ? "Update move-out date" : "Record move-out"}</button>
      </div>
      <dialog ref={dialog} className="review-delete-dialog tenancy-end-dialog" aria-labelledby={title} onCancel={e => { if (p) e.preventDefault(); }}>
        <h2 id={title}>{review.end ? "Update move-out date" : "When did you move out?"}</h2>
        <p>Record the last day of this stay. This keeps your tenancy dates accurate if you return for a separate stay. Your review will remain unpublished.</p>
    <form action={a} className="auth-form">
      <input type="hidden" name="review" value={review.id} />
      <input type="hidden" name="paid" value={review.paid} />
      <label>
        Move-out date
        <input
          name="end"
          type="date"
          required
          min={review.start}
          defaultValue={review.end ?? ""}
        />
      </label>
      <ActionFeedback message={s.message} status={s.status} />
      <div className="review-actions">
        <button disabled={p}><ActionIcon name="save" />{p ? "Saving…" : "Save move-out date"}</button>
        <button type="button" className="review-action" disabled={p} onClick={() => dialog.current?.close()}>{s.message === "Tenancy end saved." ? "Done" : "Cancel"}</button>
      </div>
    </form>
      </dialog>
    </>
  );
}
