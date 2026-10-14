"use client";
import { useActionState } from "react";
import { retryCleanup } from "./actions";
import { ActionIcon } from "@/components/ui/action-feedback";
export function CleanupForm() {
  const [s, a, p] = useActionState(retryCleanup, {});
  return <form action={a} className="auth-form operations-cleanup-form"><label className="operations-confirmation"><input type="checkbox" name="confirmed" required /><span>I understand that eligible files will be permanently removed.</span></label><button disabled={p}><ActionIcon name="trash"/>{p ? "Running cleanup…" : "Run media cleanup"}</button>{s.message && <p role="status">{s.message}</p>}</form>;
}
