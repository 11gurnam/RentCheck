import { notFound } from "next/navigation";
import { z } from "zod";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { conversations, messages } from "@/features/messaging/data";
import { MessageForm } from "@/features/messaging/forms";
export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  await requireUser("/messages");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const thread = (await conversations()).find(t => t.id === id);
  if (!thread) notFound();
  const rawPage = Number((await searchParams).page ?? 1), page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 1000 ? rawPage : 1;
  const rows = await messages(id, page);
  return <AccountShell><a href="/messages">All conversations</a><h1>Conversation with {thread.other_alias}</h1><p><a href={`/properties/${thread.property_id}`}>{thread.property_name}</a></p><p>Private messages are plain text. Contact stops if either participant blocks, the representative opts out, or the matching claim stops being approved.</p><MessageForm id={id} kind={thread.blocked_by_me ? "unblock" : "block"} /><section aria-label="Message history">{rows.length ? rows.map(m => <article key={m.id} className="dashboard-card"><h2>{m.mine ? "You" : thread.other_alias}</h2><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</time><p className="message-body">{m.body}</p>{!m.mine && !m.hidden && <details><summary>Report this message</summary><MessageForm id={m.id} kind="report" /></details>}</article>) : <p>No messages on this page.</p>}</section><nav className="pagination" aria-label="Message pages">{page > 1 && <a href={`?page=${page - 1}`}>Newer messages</a>}{rows.length === 50 && <a href={`?page=${page + 1}`}>Older messages</a>}</nav>{thread.contact_enabled && !thread.blocked ? <MessageForm id={id} kind="send" /> : <p role="status">Messaging paused. Existing messages remain available.</p>}<a href={`/messages/${id}`}>Refresh messages</a></AccountShell>;
}
