"use client";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { FilePicker } from "@/components/ui/file-picker";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
import { addPhoto, removePhoto } from "./photo-actions";
export function PhotoForm({
  review,
  photos,
  real = false,
  allowUpload = true,
}: {
  review: string;
  photos: { id: string }[];
  real?: boolean;
  allowUpload?: boolean;
}) {
  const [s, a, p] = useFeedbackAction(addPhoto, {});
  if(!allowUpload&&!photos.length)return null;
  return (
    <section className="dashboard-card" id="review-photos">
      <h2>{allowUpload ? "Review photos" : "Attached photos"}</h2>
      {allowUpload && <><p>
        Optional. Up to five {real ? "property" : "fictional"} photos, 3 MiB each. Image metadata is removed. Only upload images you have permission to share; avoid faces and private documents. Photos are public.
      </p>
      <form action={a} className="auth-form">
        <input name="review" type="hidden" value={review} />
        <FilePicker label="Photo" name="photo" accept="image/jpeg,image/png,image/webp" photo />
        <button disabled={p}><ActionIcon name="plus" />Add photo</button>
        <ActionFeedback receipt={s} message={s.message} status={s.status} />
      </form>
      </>}
      {photos.map((ph) => (
        <RemovePhoto key={ph.id} id={ph.id} />
      ))}
    </section>
  );
}
function RemovePhoto({ id }: { id: string }) {
  const [s, a, p] = useFeedbackAction(removePhoto, {});
  return (
    <form action={a}>
      <a href={"/api/photos/" + id}>View photo</a>
      <input type="hidden" name="photo" value={id} />
      <button className="action-danger" disabled={p}><ActionIcon name="trash" />Remove photo</button>
      <ActionFeedback receipt={s} message={s.message} status={s.status} />
    </form>
  );
}
