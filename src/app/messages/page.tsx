import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { conversations } from "@/features/messaging/data";
import { ContactPreference } from "@/features/messaging/forms";
export default async function MessagesPage() {
  await requireUser("/messages");
  const threads = await conversations();
  const { data, error } = await (await createDatabaseClient()).rpc("get_contact_preference");
  if (error) throw new Error("Contact preference unavailable");
  return <AccountShell><h1>Your private conversations.</h1><p>Start from a property profile when an approved representative allows contact. Only participants can read a conversation. Administrators can see individual messages you report. Deleting either account deletes the conversation.</p><section className="dashboard-card"><h2>Representative contact preference</h2><ContactPreference enabled={data} /></section><h2>Conversations</h2>{threads.length ? threads.map(t => <article key={t.id} className="dashboard-card"><h3><a href={`/messages/${t.id}`}>{t.property_name} · {t.other_alias}</a></h3><p>{t.blocked ? "Blocked" : t.contact_enabled ? "Contact available" : "Contact paused"}</p></article>) : <p>No conversations yet.</p>}</AccountShell>;
}
