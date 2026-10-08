import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
export type Conversation = { id: string; property_id: string; property_name: string; other_alias: string; is_tenant: boolean; blocked_by_me: boolean; blocked: boolean; contact_enabled: boolean };
export type Message = { id: string; body: string; mine: boolean; hidden: boolean; created_at: string };
export async function conversations(): Promise<Conversation[]> {
  const { data, error } = await (await createDatabaseClient()).rpc("get_my_conversations");
  if (error) throw new Error("Conversations unavailable");
  return data;
}
export async function messages(id: string, page: number): Promise<Message[]> {
  const { data, error } = await (await createDatabaseClient()).rpc("get_conversation_messages", { p_conversation: id, p_page: page });
  if (error) throw new Error("Messages unavailable");
  return data;
}
