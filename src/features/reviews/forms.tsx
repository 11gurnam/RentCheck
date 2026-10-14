"use client";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
import { useActionState, useState, useRef, useId, useTransition } from "react";
import { submitReview, removeReview, closeTenancy } from "./actions";
import type { OwnReview } from "./validation";
import { LandlordPreview } from "./landlord-preview";
import { CriteriaForm } from "./criteria-form";
import { reviewLanguage } from "./language";
import { checkReviewLanguage } from "./language-actions";
import type { LanguageCheck } from "./language-ai";
import type { ReviewState } from "./validation";
import { addPhoto } from "./photo-actions";
import { ReviewPhotoPicker } from "./photo-picker";
import { useRouter } from "next/navigation";
import { StarRating } from "./star-rating";
export function ReviewForm({
  property,
  review,
  existingPhotoCount = 0,
}: {
  property: { id: string; name: string; property_type: string; is_demo?: boolean };
  review?: OwnReview;
  existingPhotoCount?: number;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const selectedPhotos = useRef<File[]>([]);
  const selectPhotos = (files: File[]) => { selectedPhotos.current = files; setPhotos(files); };
  const [photoCount, setPhotoCount] = useState(existingPhotoCount);
  const [uploadProgress, setUploadProgress] = useState("");
  const [state, action, pending] = useActionState<ReviewState, FormData>(async (previous, form) => {
    // Capture the current selection and keep navigation in this upload workflow.
    const uploads = selectedPhotos.current.slice();
    form.set("withPhotos", "true");
    if (previous.savedReviewId) form.set("review", previous.savedReviewId);
    const saved = form.get("retryPhotos") === "true" && previous.savedReviewId
      ? previous : await submitReview(previous, form);
    if (!saved.savedReviewId) return { ...saved, savedReviewId: previous.savedReviewId };
    for (let i = 0; i < uploads.length; i++) {
      setUploadProgress(`Uploading photo ${i + 1} of ${uploads.length}…`);
      const upload = new FormData();
      upload.set("review", saved.savedReviewId);
      upload.set("photo", uploads[i]);
      try {
        const result = await addPhoto({}, upload);
        if (result.status !== "success") {
          selectPhotos(uploads.slice(i));
          setUploadProgress("");
          return { ...saved, status: "warning", message: `Your review is saved. ${result.message} The remaining photos are still selected; retry or remove them.` };
        }
        setPhotoCount(count => count + 1);
      } catch {
        selectPhotos(uploads.slice(i));
        setUploadProgress("");
        return { ...saved, status: "warning", message: "Your review is saved, but photo upload was interrupted. Retry the remaining selected photos." };
      }
    }
    selectPhotos([]);
    setUploadProgress("");
    router.push("/account/reviews");
    router.refresh();
    return { ...saved, status: "success", message: "Review and photos saved." };
  }, {});
  const [current, setCurrent] = useState(review?.current ?? true);
  const [start, setStart] = useState(review?.start ?? "");
  const [landlordAvailable, setLandlordAvailable] = useState(false);
  const [managerRating,setManagerRating]=useState(review?.managerRating??0);
  const [body, setBody] = useState(review?.body ?? "");
  const [preview, setPreview] = useState<LanguageCheck | null>(null);
  const [languageCheck, setLanguageCheck] = useState<LanguageCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const checkVersion = useRef(0);
  const checkComment = async (text: string) => {
    if (text.trim().length < 10) return null;
    const version = ++checkVersion.current;
    setChecking(true);
    setLanguageCheck({ ...reviewLanguage(text), source: "local" });
    try {
      const result = await checkReviewLanguage(text);
      if (version !== checkVersion.current) return null;
      setLanguageCheck(result);
      return result;
    } catch {
      if (version === checkVersion.current) setLanguageCheck({ ...reviewLanguage(text), source: "local", notice: "Language check unavailable. Please try again." });
      return null;
    } finally { if (version === checkVersion.current) setChecking(false); }
  };
  const confirmation = useRef<HTMLDialogElement>(null);
  const submission = useRef<FormData | null>(null);
  const previewTitle = useId();
  const [, startSubmission] = useTransition();
  const real = review ? review.is_demo === false : property.is_demo === false;
  return (
    <form
      action={action}
      onSubmit={async e => {
        e.preventDefault();
        submission.current = new FormData(e.currentTarget);
        const result = languageCheck?.original === body ? languageCheck : await checkComment(body);
        if (!result) return;
        setPreview(result);
        confirmation.current?.showModal();
      }}
      onReset={(e) => e.preventDefault()}
      className="auth-form tenancy-review-form"
    >
      <input type="hidden" name="property" value={property.id} />
      <input type="hidden" name="withPhotos" value={photos.length || state.savedReviewId ? "true" : "false"} />
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
        <input name="start" type="date" required defaultValue={review?.start} readOnly={!!review} onChange={e => {setStart(e.target.value);setManagerRating(0);}} />
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
      <fieldset className="landlord-rating-section"><legend>Rate your landlord / management</legend>
      {!review && <LandlordPreview property={property.id} start={start} onAvailable={setLandlordAvailable} />}
      <p className="field-hint">How was communication, maintenance and deposit handling? This score rates management separately from the accommodation.</p>
      <fieldset disabled={!review&&!landlordAvailable} className="landlord-stars"><legend className="sr-only">Landlord score</legend><StarRating label="Landlord / management" value={managerRating} onChange={setManagerRating} step={1} required={false}/></fieldset>
      <input type="hidden" name="managerRating" value={(review||landlordAvailable)&&managerRating?managerRating:""}/>
      {managerRating>0&&<button type="button" className="review-action" onClick={()=>setManagerRating(0)}>Leave landlord unrated</button>}
      <p className="field-hint">Optional. No score is recorded if you leave the stars unanswered.</p>
      </fieldset>
      <div className="review-short-fields">
      <label>Would you recommend this place? (optional)<select name="recommend" defaultValue={review?.recommend == null ? "" : String(review.recommend)}><option value="">N/A</option><option value="true">Yes</option><option value="false">No</option></select></label>
      </div>
      <label>
        Your experience
        <textarea
          name="body"
          minLength={10}
          maxLength={5000}
          required
          value={body}
          onChange={e => { setBody(e.target.value); ++checkVersion.current; setChecking(false); setLanguageCheck(null); }}
          onBlur={() => { if (languageCheck?.original !== body) void checkComment(body); }}
          aria-invalid={languageCheck?.flagged || undefined}
          aria-describedby="review-language-status"
          rows={4}
          placeholder="What worked well? What could be better?"
        />
      </label>
      <div id="review-language-status" className="review-language-status" aria-live="polite">
        {checking && <p className="sr-only">Checking your comment…</p>}
        {languageCheck?.flagged && <div className="review-language-warning"><p>Please use respectful language. {languageCheck.manualEdit ? "Edit the highlighted comment and check it again." : "Review the suggested wording below."}</p>{languageCheck.changed && <><p className="review-inline-suggestion">{languageCheck.suggestion}</p><button type="button" className="review-action" onClick={() => { setBody(languageCheck.suggestion); setLanguageCheck(null); }}>Use suggested wording</button></>}</div>}
        {languageCheck?.notice && <p className="field-hint">{languageCheck.notice} <button type="button" className="review-action" disabled={checking} onClick={() => void checkComment(body)}>Check again</button></p>}
        <p className="field-hint">AI language checks send this comment to Google Gemini. Free-tier text may be used to improve Google’s products. Check suggested wording before accepting it.</p>
      </div>
      <ReviewPhotoPicker files={photos} onChange={selectPhotos} existingCount={photoCount} disabled={pending} />
      <label>
        <input name="woman" type="checkbox" defaultChecked={review?.woman} /> I
        explicitly self-identify as a woman (optional, private answer).
      </label>
      <label>
        <input name="synthetic" type="checkbox" required /> {real ? "This is my own tenancy experience and I consent to publication under my alias." : "This is a fictional tenancy and review."}
      </label>
      <ActionFeedback message={state.message} status={state.status} />
      {uploadProgress && <p className="field-hint" role="status">{uploadProgress}</p>}
      {state.savedReviewId && <div className="review-actions"><button type="button" className="review-action" disabled={pending || !photos.length} onClick={() => { const form = new FormData(); form.set("retryPhotos", "true"); startSubmission(() => action(form)); }}>Retry photo uploads</button><a className="review-action" href="/account/reviews">Go to your reviews</a></div>}
      <button className="primary-button" disabled={pending || checking || languageCheck?.flagged}>
        <ActionIcon name="check" />
        {pending ? "Saving…" : checking ? "Checking comment…" : review ? "Save review" : "Publish review"}
      </button>
      <dialog ref={confirmation} className="review-delete-dialog review-language-dialog" aria-labelledby={previewTitle}>
        <h2 id={previewTitle}>Review your comment</h2>
        {preview && <>
          <p>{preview.manualEdit ? "Some language needs your attention. Please edit it into respectful wording before submitting." : preview.changed ? "We found language that may be inappropriate. Check that this suggestion preserves what you meant. Nothing is saved until you approve." : "Check your comment before submitting. Its wording is unchanged."}</p>
          {preview.changed && <section className="review-language-original"><h3>Your original comment</h3><p>{preview.original}</p></section>}
          <section className="review-language-suggestion"><h3>{preview.changed ? "Suggested respectful wording" : "Your comment"}</h3><p>{preview.suggestion}</p></section>
          <p className="field-hint">Only the approved comment is published. Ratings, dates and rent stay as you entered them.</p>
          <div className="review-actions">
            <button type="button" className="review-action" onClick={() => confirmation.current?.close()}>Keep editing</button>
            {!preview.manualEdit && <button type="button" disabled={pending} onClick={() => {
              const form = submission.current;
              if (!form) return;
              form.set("body", preview.suggestion);
              setBody(preview.suggestion);
              confirmation.current?.close();
              startSubmission(() => action(form));
            }}><ActionIcon name="check" />{preview.changed ? "Approve wording and submit" : review ? "Confirm and save" : "Confirm and publish"}</button>}
          </div>
        </>}
      </dialog>
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
