import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
const config = localBackendConfiguration();
if (!config) throw new Error("Local backend required");
it("live private messaging denies outsiders and serializes concurrent rate limits", async () => {
  const c = config!, service = createClient(c.url, c.serviceKey, { auth: { persistSession: false } });
  const users: string[] = [], clients: (typeof service)[] = []; let property: string | undefined, path: string | undefined;
  try {
    for (let i = 0; i < 3; i++) {
      const email = `messaging-api-${crypto.randomUUID()}@example.test`, password = "Synthetic messaging API passphrase";
      const u = await service.auth.admin.createUser({ email, password, email_confirm: true }); expect(u.error).toBeNull(); users.push(u.data.user!.id);
      const client = createClient(c.url, c.publicKey, { auth: { persistSession: false } }); expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull(); clients.push(client);
    }
    const p = await clients[0].rpc("create_property", { p_input: { name: "Synthetic contact API " + crypto.randomUUID().slice(0, 6), address: "Synthetic API lane " + crypto.randomUUID(), state: "Delhi", city: "API fixture city", locality: "Fixture area", type: "Flat", min: 1, max: 2, synthetic: true, declaredOwner: true }, p_acknowledged: true }); expect(p.error).toBeNull(); property = p.data;
    const doc = crypto.randomUUID(); path = `claim/${doc}.jpg`;
    expect((await service.storage.from("rental-documents").upload(path, new Uint8Array([1]), { contentType: "image/jpeg" })).error).toBeNull();
    const claim = await service.rpc("register_evidence_document", { p_user: users[0], p_document: doc, p_extension: "jpg", p_property: property }); expect(claim.error).toBeNull();
    fixtureAdmin(users[0], true); expect((await clients[0].rpc("decide_claim", { p_claim: claim.data, p_decision: "approved", p_reason: "Synthetic API claim approval" })).error).toBeNull(); fixtureAdmin(users[0], false);
    await clients[0].rpc("set_contact_preference", { p_enabled: true });
    const contacts = await clients[1].rpc("get_contactable_representatives", { p_property: property }); expect(contacts.error).toBeNull();
    const started = await clients[1].rpc("start_conversation", { p_property: property, p_profile: contacts.data[0].profile_id, p_consent: true }); expect(started.error).toBeNull();
    expect((await clients[2].rpc("get_conversation_messages", { p_conversation: started.data })).error).not.toBeNull();
    const results = await Promise.all(Array.from({ length: 14 }, (_, i) => clients[1].rpc("send_message", { p_conversation: started.data, p_body: "Synthetic concurrent message " + i })));
    expect(results.filter(r => !r.error)).toHaveLength(10); expect(results.filter(r => r.error)).toHaveLength(4);
    expect((await clients[0].rpc("get_conversation_messages", { p_conversation: started.data })).data).toHaveLength(10);
  } finally {
    for (const user of users) expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    if (path) await service.storage.from("rental-documents").remove([path]);
    if (property) await service.from("properties").delete().eq("id", property);
  }
}, 60000);
