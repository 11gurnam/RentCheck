"use client";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
import { useActionState } from "react";
import { addPhoto, removePhoto } from "./photo-actions";
export function PhotoForm({
  review,
  photos,
}: {
  review: string;
  photos: { id: string }[];
}) {
  const [s, a, p] = useActionState(addPhoto, {});
  return (
    <section className="dashboard-card" id="review-photos">
      <h2>Review photos</h2>
      <p>
        Optional. Up to three fictional photos, 5 MiB each. Image metadata is
        removed.
      </p>
      <form action={a} className="auth-form">
        <input name="review" type="hidden" value={review} />
        <label>
          Photo
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </label>
        <button disabled={p}><ActionIcon name="plus" />Add photo</button>
        <ActionFeedback message={s.message} status={s.status} />
      </form>
      {photos.map((ph) => (
        <RemovePhoto key={ph.id} id={ph.id} />
      ))}
    </section>
  );
}
function RemovePhoto({ id }: { id: string }) {
  const [s, a, p] = useActionState(removePhoto, {});
  return (
    <form action={a}>
      <a href={"/api/photos/" + id}>View photo</a>
      <input type="hidden" name="photo" value={id} />
      <button className="action-danger" disabled={p}><ActionIcon name="trash" />Remove photo</button>
      <ActionFeedback message={s.message} status={s.status} />
    </form>
  );
}
