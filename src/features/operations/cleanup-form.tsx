"use client";
import { useActionState } from "react";
import { retryCleanup } from "./actions";
export function CleanupForm() {
  const [s, a, p] = useActionState(retryCleanup, {});
  return <form action={a} className="auth-form"><label><input type="checkbox" name="confirmed" required /> Remove expired evidence and retired photos; retry queued account-deletion cleanup</label><button disabled={p}>Run media cleanup</button>{s.message && <p role="status">{s.message}</p>}</form>;
}
