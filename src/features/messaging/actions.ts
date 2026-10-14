"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
type State = { message?: string };
export async function contactPreference(_: State, form: FormData): Promise<State> {
  await requireUser("/messages");
  const { error } = await (await createDatabaseClient()).rpc("set_contact_preference", { p_enabled: form.get("enabled") === "on" });
  if (error) return { message: "Could not save contact preference." };
  revalidatePath("/messages");
  return { message: "Contact preference saved." };
}
export async function startConversation(_: State, form: FormData): Promise<State> {
  await requireUser("/messages");
  const v = z.object({ property: z.uuid(), profile: z.uuid(), consent: z.literal("on") }).safeParse(Object.fromEntries(form));
  if (!v.success) return { message: "Choose a representative and confirm private contact." };
  const { data, error } = await (await createDatabaseClient()).rpc("start_conversation", { p_property: v.data.property, p_profile: v.data.profile, p_consent: true });
  if (error) return { message: error.message };
  redirect(`/messages/${data}`);
}
export async function messagingAction(_: State, form: FormData): Promise<State> {
  await requireUser("/messages");
  const kind = form.get("kind"), id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { message: "Choose a valid conversation or message." };
  const db = await createDatabaseClient();
  let error;
  if (kind === "send") {
    const body = z.string().trim().min(1).max(2000).safeParse(form.get("body"));
    if (!body.success) return { message: "Use 1–2000 characters." };
    ({ error } = await db.rpc("send_message", { p_conversation: id.data, p_body: body.data }));
  } else if (kind === "block" || kind === "unblock") {
    ({ error } = await db.rpc("set_conversation_block", { p_conversation: id.data, p_blocked: kind === "block" }));
  } else if (kind === "report") {
    const reason = z.string().trim().min(10).max(2000).safeParse(form.get("reason"));
    if (!reason.success) return { message: "Use a report reason of 10–2000 characters." };
    ({ error } = await db.rpc("report_message", { p_message: id.data, p_reason: reason.data }));
  } else return { message: "Unknown action." };
  if (error) return { message: error.message };
  revalidatePath("/messages", "layout");
  revalidatePath("/admin/messages");
  return { message: kind === "send" ? "Message sent." : kind === "report" ? "Report submitted for administrator review." : "Blocking preference saved." };
}
export async function decideMessageReport(_: State, form: FormData): Promise<State> {
  await requireUser("/admin");
  if (!(await isAdministrator())) return { message: "Administrator access required." };
  const v = z.object({ report: z.uuid(), decision: z.enum(["kept", "removed"]), reason: z.string().trim().min(10).max(2000) }).safeParse(Object.fromEntries(form));
  if (!v.success) return { message: "Choose a decision and enter an audit reason." };
  const { error } = await (await createDatabaseClient()).rpc("decide_message_report", { p_report: v.data.report, p_decision: v.data.decision, p_reason: v.data.reason });
  if (error) return { message: error.message };
  revalidatePath("/admin/messages"); revalidatePath("/messages", "layout");
  return { message: "Message report decision saved and audited." };
}
