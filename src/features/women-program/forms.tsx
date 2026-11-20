"use client";

import { useState } from "react";
import { ActionFeedback, ActionIcon, StatusBadge } from "@/components/ui/action-feedback";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { saveWomenFeedback, saveWomenPreferences } from "./actions";
import { genderOptions, optionalRating, ratingFields, type ProgramPreferences } from "./fields";

export function WomenProgramPreferences({ preferences }: { preferences: ProgramPreferences }) {
  const [state, action, pending] = useFeedbackAction(saveWomenPreferences, {});
  const [gender, setGender] = useState(preferences.gender ?? "");
  const [tenancy, setTenancy] = useState(preferences.tenancy ?? "");
  const [consent, setConsent] = useState(preferences.opted_in);
  const eligible = gender === "woman" && ["current", "former"].includes(tenancy);
  return (
    <section className="dashboard-card women-program-panel" id="women-program">
      <h2>Private tenant profile</h2>
      <p className="field-hint">These questions are optional. Your answers are stored separately from your public profile. You can change or clear them here at any time.</p>
      <form action={action} className="auth-form" onReset={event => event.preventDefault()}>
        <label>How do you identify yourself?
          <select name="gender" value={gender} onChange={event => {
            setGender(event.target.value as typeof gender);
            setConsent(false);
            setTenancy("");
          }}>
            <option value="">No answer</option>
            {genderOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {gender === "self_described" && (
          <label>Self-description (optional)<input name="description" maxLength={100} defaultValue={preferences.description ?? ""}/></label>
        )}
        {gender === "woman" && (
          <label>Are you a woman tenant who currently lives or has previously lived in a rental property?
            <select name="tenancy" value={tenancy} onChange={event => {
              setTenancy(event.target.value as typeof tenancy);
              if (!["current", "former"].includes(event.target.value)) setConsent(false);
            }}>
              <option value="">Select an option</option>
              <option value="current">Yes, I currently live in a rental property.</option>
              <option value="former">Yes, I have previously lived in a rental property.</option>
              <option value="none">No.</option>
            </select>
          </label>
        )}
        {eligible && (
          <fieldset className="women-program-consent">
            <legend>Women Tenant Recommendation Program</legend>
            <p className="field-hint">Choose which reviews to share with the program. Only combined ratings are public.</p>
            <label className="checkbox-row"><input type="checkbox" name="opt_in" checked={consent} onChange={event => setConsent(event.target.checked)}/>Join the Women Tenant Recommendation Program</label>
          </fieldset>
        )}
        {preferences.opted_in && (!eligible || !consent) && <p className="field-hint">Saving these changes withdraws your program feedback from all properties. Your regular reviews remain available.</p>}
        <ActionFeedback receipt={state} status={state.status} message={state.message}/>
        <button disabled={pending}><ActionIcon name="save"/>{pending ? "Saving…" : "Save private preferences"}</button>
      </form>
    </section>
  );
}

export function WomenProgramFeedback({ review, preferences, association, demo }: {
  review: string; preferences: ProgramPreferences | null; association: string; demo: boolean;
}) {
  const [state, action, pending] = useFeedbackAction(saveWomenFeedback, {});
  return (
    <section className="dashboard-card women-program-panel" id="women-program-feedback">
      <h2>Women’s experience feedback</h2>
      {preferences?.opted_in ? <>
        <p className="field-hint">Share ratings for this stay. The public sees combined scores. Program administrators can see ratings without your name, and your private notes are visible only to you.</p>
        <dl className="women-program-status">
          <div><dt>Gender identity</dt><dd>Self-declared</dd></div>
          <div><dt>Property association</dt><dd><StatusBadge status={association}>{association === "approved" ? (demo ? "Demo approved" : "Verified") : association}</StatusBadge></dd></div>
        </dl>
        {demo && <p className="field-hint">Use fictional feedback for this demonstration property.</p>}
        <form action={action} className="auth-form" onReset={event => event.preventDefault()}>
          <input name="review" type="hidden" value={review}/>
          <div className="women-rating-grid">
            {ratingFields.map(([key, label]) => (
              <label key={key}>{label}
                <select name={key} required={!optionalRating(key)} defaultValue={preferences.feedback?.ratings[key] ?? ""}>
                  <option value="">{optionalRating(key) ? "Leave unrated (optional)" : "Choose a rating"}</option>
                  {[1,2,3,4,5].map(score => <option key={score} value={score}>{score} / 5{score === 1 ? " · Very poor" : score === 5 ? " · Excellent" : ""}</option>)}
                </select>
              </label>
            ))}
          </div>
          <label>Private notes (optional)
            <textarea name="comment" maxLength={1500} rows={3} defaultValue={preferences.feedback?.comment ?? ""}/>
          </label>
          <p className="field-hint">You can describe concerns without naming people or sharing identifying details. To request moderation, use the property or review report controls.</p>
          <label className="checkbox-row"><input type="checkbox" name="consent" required/>Include these ratings in the anonymous women’s recommendation for this property.</label>
          <div className="form-actions">
            <button disabled={pending}><ActionIcon name="save"/>{pending ? "Saving…" : "Save private feedback"}</button>
            {preferences.feedback && <button className="review-action warning-action" name="intent" value="remove" formNoValidate disabled={pending}>Withdraw feedback</button>}
          </div>
          <ActionFeedback receipt={state} status={state.status} message={state.message}/>
        </form>
      </> : (
        <p className="field-hint">Manage optional participation in your <a href="/account?tab=tenant-profile">private tenant profile</a>.</p>
      )}
    </section>
  );
}
