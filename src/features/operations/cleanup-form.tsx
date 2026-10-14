"use client";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { retryCleanup } from "./actions";
import { ActionFeedback, ActionIcon } from "@/components/ui/action-feedback";
export function CleanupForm() {
  const [s, a, p] = useFeedbackAction(retryCleanup, {});
  return <form action={a} className="auth-form operations-cleanup-form"><label className="operations-confirmation"><input type="checkbox" name="confirmed" required /><span>I understand that eligible files will be permanently removed.</span></label><button disabled={p}><ActionIcon name="trash"/>{p ? "Running cleanup…" : "Run media cleanup"}</button><ActionFeedback receipt={s} message={s.message} status={s.status}/></form>;
}
