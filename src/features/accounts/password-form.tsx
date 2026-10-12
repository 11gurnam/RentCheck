"use client";
import { useActionState } from "react";
import { ActionModal } from "@/components/ui/action-modal";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
import { changePassword } from "./actions";
import { initialFormState } from "./validation";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialFormState);
  return <ActionModal title="Change password" trigger="Change password">
    {state.status === "success" ? <ActionFeedback message={state.message} status="success" /> : <form action={action} className="auth-form" onReset={event => event.preventDefault()}>
      <p className="field-hint">Confirm your current password, then choose a new password with at least 10 characters.</p>
      {([{name:"currentPassword",label:"Current password",autocomplete:"current-password"},{name:"password",label:"New password",autocomplete:"new-password"},{name:"confirmPassword",label:"Confirm new password",autocomplete:"new-password"}] as const).map(field => <label key={field.name}>{field.label}<input aria-label={field.label} name={field.name} type="password" autoComplete={field.autocomplete} required minLength={field.name === "currentPassword" ? 1 : 10} maxLength={128} aria-invalid={!!state.fieldErrors?.[field.name]} aria-describedby={state.fieldErrors?.[field.name] ? `${field.name}-error` : undefined}/>{state.fieldErrors?.[field.name] && <small className="field-error" id={`${field.name}-error`}>{state.fieldErrors[field.name]}</small>}</label>)}
      <button disabled={pending}><ActionIcon name="check" />{pending ? "Updating…" : "Update password"}</button>
      <ActionFeedback message={state.message} status={state.status === "error" ? "error" : "success"}/>
    </form>}
  </ActionModal>;
}
