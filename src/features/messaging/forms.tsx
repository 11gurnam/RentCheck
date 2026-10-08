"use client";
import { useActionState } from "react";
import { contactPreference, startConversation, messagingAction, decideMessageReport } from "./actions";
export function ContactPreference({ enabled }: { enabled: boolean }) {
  const [s, a, p] = useActionState(contactPreference, {});
  return <form action={a} className="auth-form"><label><input type="checkbox" name="enabled" defaultChecked={enabled} /> Allow tenants to contact me about properties covered by my approved claims</label><button disabled={p}>Save contact preference</button>{s.message && <p role="status">{s.message}</p>}</form>;
}
export function StartConversation({ property, profile, alias }: { property: string; profile: string; alias: string }) {
  const [s, a, p] = useActionState(startConversation, {});
  return <form action={a} className="auth-form"><input type="hidden" name="property" value={property} /><input type="hidden" name="profile" value={profile} /><p>Representative: {alias}</p><label><input name="consent" type="checkbox" required /> I agree to private contact about this property</label><button disabled={p}>Start conversation</button>{s.message && <p role="status">{s.message}</p>}</form>;
}
export function MessageForm({ id, kind }: { id: string; kind: "send" | "block" | "unblock" | "report" }) {
  const [s, a, p] = useActionState(messagingAction, {});
  return <form action={a} className="auth-form"><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value={kind} />{kind === "send" && <label>Your message<textarea name="body" required minLength={1} maxLength={2000} /></label>}{kind === "report" && <label>Message report reason<textarea name="reason" required minLength={10} maxLength={2000} /></label>}<button disabled={p}>{kind === "send" ? "Send message" : kind === "report" ? "Report message" : kind === "block" ? "Block conversation" : "Unblock conversation"}</button>{s.message && <p role="status">{s.message}</p>}</form>;
}
export function MessageDecision({ report }: { report: string }) {
  const [s, a, p] = useActionState(decideMessageReport, {});
  return <form action={a} className="auth-form"><input type="hidden" name="report" value={report} /><label>Message decision<select name="decision"><option value="kept">Keep message</option><option value="removed">Remove message</option></select></label><label>Decision reason<textarea name="reason" required minLength={10} maxLength={2000} /></label><button disabled={p}>Save message decision</button>{s.message && <p role="status">{s.message}</p>}</form>;
}
