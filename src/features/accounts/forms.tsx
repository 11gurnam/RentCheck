"use client";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { SuccessNotice } from "@/components/ui/success-notice";
import { ActionIcon } from "@/components/ui/action-feedback";

import { useRef, useState } from "react";
import {
  register,
  signIn,
  signInWithGoogle,
  signOut,
  updateAlias,
} from "./actions";
import { initialFormState, registerSchema, type FormState } from "./validation";

function Feedback({ state }: { state: FormState }) {
  return state.message ? (
    <p
      className={`form-feedback ${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      <ActionIcon name={state.status === "success" ? "check" : "warning"} /> {state.message}{state.status === "success" && <SuccessNotice message={state.message} receipt={state}/>}
    </p>
  ) : null;
}
function Field({
  label,
  name,
  type = "text",
  autoComplete,
  state,
  hint,
  defaultValue,
}: {
  label: string;
  name: "email" | "password" | "confirmPassword" | "alias";
  type?: string;
  autoComplete: string;
  state: FormState;
  hint?: string;
  defaultValue?: string;
}) {
  const error = state.fieldErrors?.[name];
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        maxLength={name === "alias" ? 40 : name === "email" ? 254 : 128}
        aria-invalid={!!error}
        aria-describedby={
          [hint ? `${name}-hint` : null, error ? `${name}-error` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {hint && (
        <p className="field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function AccountForm({
  mode,
  next,
  googleEnabled,
}: {
  mode: "sign-in" | "register";
  next: string;
  googleEnabled: boolean;
}) {
  const [state, action, pending] = useFeedbackAction(
    mode === "sign-in" ? signIn : register,
    initialFormState,
  );
  const [googleState, googleAction, googlePending] = useFeedbackAction(
    signInWithGoogle,
    initialFormState,
  );
  const touched = useRef(new Set<string>());
  const [registrationValid, setRegistrationValid] = useState(false);
  const [clientState, setClientState] = useState<FormState | null>(null);
  const fieldState = mode === "register" ? (clientState ?? state) : state;

  function validateRegistration(form: HTMLFormElement, name?: string) {
    if (name) touched.current.add(name);
    const result = registerSchema.safeParse(
      Object.fromEntries(new FormData(form)),
    );
    setRegistrationValid(result.success);
    setClientState({
      status: "idle",
      fieldErrors: result.success
        ? {}
        : Object.fromEntries(
            result.error.issues
              .filter((issue) => touched.current.has(String(issue.path[0])))
              .map((issue) => [issue.path[0], issue.message]),
          ),
    });
    return result.success;
  }

  return (
    <>
      <form
        action={action}
        noValidate
        onChange={(event) => {
          if (mode === "register" && event.target instanceof HTMLInputElement)
            validateRegistration(event.currentTarget, event.target.name);
        }}
        onBlur={(event) => {
          if (mode === "register" && event.target instanceof HTMLInputElement)
            validateRegistration(event.currentTarget, event.target.name);
        }}
        onSubmit={(event) => {
          if (mode === "register" && !validateRegistration(event.currentTarget))
            event.preventDefault();
        }}
        onReset={() => {
          touched.current.clear();
          setRegistrationValid(false);
          setClientState(null);
        }}
      >
        <input type="hidden" name="next" value={next} />
        {mode === "register" && (
          <Field
            label="Public alias"
            name="alias"
            autoComplete="nickname"
            state={fieldState}
            hint="This name appears on reviews. Avoid your real name or email."
          />
        )}
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          state={fieldState}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          state={fieldState}
          hint={
            mode === "register"
              ? "Use 10–128 characters. A unique passphrase works well."
              : undefined
          }
        />
        {mode === "register" && (
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            state={fieldState}
          />
        )}
        <Feedback state={state} />
        <button
          className="primary-link form-submit"
          disabled={
            pending || googlePending || (mode === "register" && !registrationValid)
          }
        >
          {pending
            ? "Please wait…"
            : mode === "register"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
      {googleEnabled ? (
        <>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <form action={googleAction}>
            <input type="hidden" name="next" value={next} />
            <button
              className="secondary-button form-submit"
              disabled={pending || googlePending}
            >
              <svg aria-hidden="true" className="google-icon" viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.04H12v3.86h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.25c1.9-1.75 2.97-4.32 2.97-7.35Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.25-2.51c-.9.6-2.04.97-3.37.97-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59A5.99 5.99 0 0 1 12 5.96Z"/></svg>{googlePending ? "Opening Google…" : "Continue with Google"}
            </button>
            <Feedback state={googleState} />
          </form>
        </>
      ) : (
        <p className="field-hint google-unavailable">
          Google sign-in is being set up. You can use email and password.
        </p>
      )}
    </>
  );
}

export function AliasForm({ alias }: { alias: string }) {
  const [state, action, pending] = useFeedbackAction(
    updateAlias,
    initialFormState,
  );
  return (
    <form action={action} noValidate>
      <Field
        label="Public alias"
        name="alias"
        autoComplete="nickname"
        defaultValue={alias}
        state={state}
        hint="Only this alias is public. Changing it never changes your permissions."
      />
      <Feedback state={state} />
      <button className="primary-link" disabled={pending}>
        <ActionIcon name="save" />{pending ? "Saving…" : "Save alias"}
      </button>
    </form>
  );
}

export function SignOutForm() {
  const [state, action, pending] = useFeedbackAction(signOut, initialFormState);
  return (
    <form action={action}>
      <button className="secondary-button" disabled={pending}>
        <ActionIcon name="logout" />{pending ? "Signing out…" : "Sign out"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
