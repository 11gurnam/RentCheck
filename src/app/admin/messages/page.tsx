import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { MessageDecision } from "@/features/messaging/forms";
export default async function MessageReportsPage() {
  await requireUser("/admin");
  if (!(await isAdministrator())) return <AccountShell><h1>Access restricted.</h1></AccountShell>;
  const { data, error } = await (await createDatabaseClient()).rpc("get_admin_message_reports");
  if (error) throw new Error("Message reports unavailable");
  const reports = data as { id: string; body: string; reason: string; status: string; decision_reason: string | null }[];
  return <AccountShell><h1>Private message reports.</h1><p>Only reported messages are shown. This queue does not grant access to full conversations.</p>{reports.map(r => <article key={r.id} className="dashboard-card"><h2>{r.status}</h2><p className="message-body">{r.body}</p><p>Report: {r.reason}</p>{r.status === "pending" ? <MessageDecision report={r.id} /> : <p>Decision: {r.decision_reason}</p>}</article>)}{!reports.length && <p>No message reports.</p>}</AccountShell>;
}
