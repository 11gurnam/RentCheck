"use client";
import { useActionState, useState } from "react";
import { submitReview, removeReview, closeTenancy } from "./actions";
import type { OwnReview } from "./validation";
import { LandlordPreview } from "./landlord-preview";
export function ReviewForm({
  property,
  review,
}: {
  property: { id: string; name: string };
  review?: OwnReview;
}) {
  const [state, action, pending] = useActionState(submitReview, {});
  const [current, setCurrent] = useState(review?.current ?? true);
  const [start, setStart] = useState(review?.start ?? "");
  const [landlordAvailable, setLandlordAvailable] = useState(false);
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="auth-form"
    >
      <input type="hidden" name="property" value={property.id} />
      {review && <input type="hidden" name="review" value={review.id} />}
      <p>
        Writing about <strong>{property.name}</strong>. Use fictional examples
        only. Your public alias appears with this review.
      </p>
      <label>
        Tenancy start
        <input
          name="start"
          type="date"
          required
          defaultValue={review?.start}
          readOnly={!!review}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
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
        Tenancy end
        <input
          name="end"
          type="date"
          required={!current}
          disabled={current}
          defaultValue={review?.end ?? ""}
        />
      </label>
      {current && <input name="end" type="hidden" value="" />}
      <label>
        Monthly rent paid (INR)
        <input
          name="paid"
          type="number"
          min="0"
          max="10000000"
          required
          defaultValue={review?.paid}
        />
      </label>
      <label>
        Property rating
        <select
          name="propertyRating"
          defaultValue={review?.propertyRating ?? 5}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </label>
      {!review && (
        <LandlordPreview
          property={property.id}
          start={start}
          onAvailable={setLandlordAvailable}
        />
      )}
      <label>
        Landlord / management rating
        <select
          name="managerRating"
          disabled={!review && !landlordAvailable}
          defaultValue={review?.managerRating ?? ""}
        >
          <option value="">Unanswered / manager unknown</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </label>
      {!review && !landlordAvailable && (
        <input type="hidden" name="managerRating" value="" />
      )}
      <p className="field-hint">
        Management is attributed to the manager recorded on your tenancy start
        date. Leave its rating unanswered if none is recorded.
      </p>
      <label>
        Your experience
        <textarea
          name="body"
          minLength={10}
          maxLength={5000}
          required
          defaultValue={review?.body}
          rows={5}
        />
      </label>
      <label>
        <input name="woman" type="checkbox" defaultChecked={review?.woman} /> I
        explicitly self-identify as a woman (optional, private answer).
      </label>
      <label>
        Would you recommend this place? (optional)
        <select
          name="recommend"
          defaultValue={
            review?.recommend == null ? "" : String(review.recommend)
          }
        >
          <option value="">Unanswered</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
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
  return (
    <form action={a}>
      <input type="hidden" name="review" value={id} />
      <label>
        <input type="checkbox" required /> Confirm deleting this review
      </label>
      <button disabled={p}>Delete review</button>
      {s.message && <p role="status">{s.message}</p>}
    </form>
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
