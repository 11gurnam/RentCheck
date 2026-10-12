"use client";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
import { useActionState, useId, useRef, useState, useTransition } from "react";
import { CameraIcon } from "@/components/ui/camera-icon";
import { addPhoto, photoUploadContext } from "./photo-actions";

export function CardPhotoUpload({ property, name }: { property: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [context, setContext] = useState<Awaited<ReturnType<typeof photoUploadContext>> | null>(null);
  const [error, setError] = useState("");
  const [loading, load] = useTransition();
  const [state, action, pending] = useActionState(addPhoto, {});
  function open() {
    dialog.current?.showModal();
    setError("");
    load(async () => {
      try { setContext(await photoUploadContext(property)); }
      catch { setError("Couldn’t load your reviews. Close and try again."); }
    });
  }
  const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  return <>
    <button type="button" className="property-photo-link" onClick={open}><CameraIcon />Add photos</button>
    <dialog ref={dialog} className="card-photo-dialog" aria-labelledby={title} onCancel={e => { if (pending) e.preventDefault(); }}>
      <div className="card-photo-dialog-heading"><div><h2 id={title}>Add photos</h2><p>{name}</p></div><button type="button" className="photo-dialog-close" aria-label="Close photo upload" disabled={pending} onClick={() => dialog.current?.close()}>×</button></div>
      {loading ? <p role="status">Loading your reviews…</p> : error ? <p role="alert">{error}</p> : context && !context.signedIn ? <><p>Sign in to add photos from your stay.</p><a className="button" href="/sign-in">Sign in</a></> : context && !context.reviews.length ? <><p>Photos are attached to your tenancy review. Add a review of this place first.</p><a className="button" href={`/reviews/new?property=${property}`}>Write a review</a></> : context && <form action={action} className="auth-form card-photo-form">
        {context.reviews.length === 1 ? <input type="hidden" name="review" value={context.reviews[0].id} /> : <label>Choose your stay<select name="review" required>{context.reviews.map(r => <option key={r.id} value={r.id}>{dateLabel(r.start)} → {r.end ? dateLabel(r.end) : "Current"}</option>)}</select></label>}
        <label>Photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required disabled={pending} /></label>
        <p className="field-hint">JPEG, PNG or WebP · up to 5 MiB · 3 photos per review. Fictional examples only.</p>
        <ActionFeedback message={state.message} status={state.status} />
        <div className="card-photo-dialog-actions"><button disabled={pending}><ActionIcon name="upload" />{pending ? "Uploading…" : "Upload photo"}</button><button type="button" className="photo-dialog-cancel" disabled={pending} onClick={() => dialog.current?.close()}>Done</button></div>
      </form>}
    </dialog>
  </>;
}
