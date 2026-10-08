"use client";
import { useActionState } from "react";
import { addPhoto, removePhoto } from "./photo-actions";
export function PhotoForm({
  review,
  photos,
  real = false,
}: {
  review: string;
  photos: { id: string }[];
  real?: boolean;
}) {
  const [s, a, p] = useActionState(addPhoto, {});
  return (
    <section className="dashboard-card">
      <h2>Review photos</h2>
      <p>
        Optional. Up to three {real ? "property" : "fictional"} photos, 5 MiB each. Image metadata is removed. Only upload images you have permission to share; avoid faces and private documents. Photos are public.
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
        <button disabled={p}>Add photo</button>
        {s.message && <p role="status">{s.message}</p>}
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
      <button disabled={p}>Remove photo</button>
      {s.message && <p role="status">{s.message}</p>}
    </form>
  );
}
