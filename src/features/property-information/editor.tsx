"use client";

import { useState } from "react";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { ActionModal, ModalCancel } from "@/components/ui/action-modal";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { RentalPreferenceFields } from "./fields";
import { saveRentalPreferences } from "./actions";
import type { RentalPreference } from "./preferences";

export function RentalPreferencesEditor({ property, preferences }: { property: string; preferences: RentalPreference[] }) {
  const [state, action, pending] = useFeedbackAction(saveRentalPreferences, {});
  const [revision, setRevision] = useState(0);
  return (
    <ActionModal title="Edit rental preferences" trigger="Edit rental preferences" onClose={() => setRevision(value => value + 1)}>
      <form action={action} className="auth-form">
        <input type="hidden" name="property" value={property}/>
        <RentalPreferenceFields key={revision} initial={preferences}/>
        <p className="field-hint">Clear all choices to remove your public statement.</p>
        <div className="form-actions">
          <ModalCancel disabled={pending}/>
          <button disabled={pending}>{pending ? "Saving…" : "Save preferences"}</button>
        </div>
        <ActionFeedback receipt={state} status={state.status} message={state.message}/>
      </form>
    </ActionModal>
  );
}
