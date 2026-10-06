import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
const config = localBackendConfiguration();
if (!config) throw new Error("Local test backend required");
it("concurrent saves and exact-address contributions are conflict safe", async () => {
  const admin = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false },
  });
  const client = createClient(config.url, config.publicKey, {
    auth: { persistSession: false },
  });
  const password = "Synthetic contribution passphrase 2026";
  const email = `contribution-${crypto.randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const id = data.user!.id;
  const properties: string[] = [];
  try {
    expect(
      (await client.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    const saves = await Promise.all(
      Array.from({ length: 6 }, () =>
        client.rpc("set_saved_property", {
          p_property: "20000000-0000-4000-8000-000000000001",
          p_saved: true,
        }),
      ),
    );
    expect(saves.every((r) => !r.error)).toBe(true);
    expect((await client.rpc("get_saved_properties")).data).toHaveLength(1);
    const input = {
      name: `Synthetic Integration ${crypto.randomUUID()}`,
      address: `Demo Unique Lane ${crypto.randomUUID()}`,
      state: "Delhi",
      city: "Integration City",
      locality: "Test Area",
      type: "Flat",
      min: 1000,
      max: 2000,
      synthetic: true,
    };
    const results = await Promise.all([
      client.rpc("create_property", { p_input: input }),
      client.rpc("create_property", { p_input: input }),
    ]);
    for (const r of results) if (!r.error) properties.push(r.data);
    expect(properties).toHaveLength(1);
    expect(results.filter((r) => r.error)).toHaveLength(1);
    expect(
      (
        await client
          .from("properties")
          .update({ name: "Hacked" })
          .eq("id", properties[0])
      ).error,
    ).not.toBeNull();
  } finally {
    for (const property of properties)
      expect(
        (await admin.from("properties").delete().eq("id", property)).error,
      ).toBeNull();
    await admin.auth.admin.deleteUser(id);
  }
});
