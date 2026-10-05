import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";

const configuration = localBackendConfiguration();
if (!configuration)
  throw new Error(
    "Start local Supabase and run npm run backend:env before live integration tests.",
  );
const admin = createClient(configuration.url, configuration.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const createPublicClient = () =>
  createClient(configuration.url, configuration.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const syntheticPassword = "Synthetic test passphrase 2026";
const createdUsers: string[] = [];
let first: SupabaseClient;
let second: SupabaseClient;
let firstId: string;
let secondId: string;

beforeAll(async () => {
  for (const [index, alias] of [
    "IntegrationTenantOne",
    "IntegrationTenantTwo",
  ].entries()) {
    const email = `phase1-integration-${crypto.randomUUID()}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: syntheticPassword,
      email_confirm: true,
      user_metadata: {
        public_alias: alias,
        is_administrator: true,
        role: "admin",
        name: "Synthetic private identity",
      },
    });
    if (error || !data.user)
      throw new Error("Synthetic integration user creation failed.");
    createdUsers.push(data.user.id);
    const client = createPublicClient();
    const signIn = await client.auth.signInWithPassword({
      email,
      password: syntheticPassword,
    });
    expect(signIn.error).toBeNull();
    if (index === 0) {
      first = client;
      firstId = data.user.id;
    } else {
      second = client;
      secondId = data.user.id;
    }
  }
});
afterAll(async () => {
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
});

describe("live isolated account access", () => {
  it("anonymous readers receive only public alias fields, never account IDs or email", async () => {
    const { data, error } = await createPublicClient()
      .from("public_profiles")
      .select("*");
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(2);
    for (const profile of data ?? []) {
      expect(Object.keys(profile).sort()).toEqual([
        "created_at",
        "id",
        "public_alias",
        "updated_at",
      ]);
      expect([firstId, secondId]).not.toContain(profile.id);
    }
  });
  it("anonymous direct RPC and private schema access are denied", async () => {
    expect(
      (await createPublicClient().rpc("get_my_account")).error,
    ).not.toBeNull();
    expect(
      (
        await createPublicClient()
          .schema("private")
          .from("accounts")
          .select("*")
      ).error,
    ).not.toBeNull();
  });
  it("own account is readable and aliases persist without affecting other users", async () => {
    const beforeOther = await second.rpc("get_my_account");
    expect(
      (
        await first.rpc("set_public_alias", {
          requested_alias: "IntegrationUpdated",
        })
      ).error,
    ).toBeNull();
    const mine = await first.rpc("get_my_account");
    expect(mine.data).toHaveLength(1);
    expect(mine.data[0]).toMatchObject({
      public_alias: "IntegrationUpdated",
      is_administrator: false,
    });
    expect((await second.rpc("get_my_account")).data).toEqual(beforeOther.data);
    expect(
      (await first.rpc("get_my_account", { user_id: secondId })).error,
    ).not.toBeNull();
  });
  it("direct writes, invalid aliases and self-admin escalation are denied", async () => {
    expect(
      (
        await first
          .from("public_profiles")
          .update({ public_alias: "Hacked" })
          .neq("id", "00000000-0000-0000-0000-000000000000")
      ).error,
    ).not.toBeNull();
    expect(
      (
        await first.rpc("set_public_alias", {
          requested_alias: "private@example.test",
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await first
          .schema("private")
          .from("administrator_grants")
          .insert({ user_id: firstId, reason: "Self grant" })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await first.auth.updateUser({
          data: { is_administrator: true, role: "admin" },
        })
      ).error,
    ).toBeNull();
    expect((await first.rpc("is_administrator")).data).toBe(false);
  });
  it("real auth refresh produces a verified user and logout revokes that session", async () => {
    const session = await second.auth.getSession();
    const refreshed = await second.auth.refreshSession({
      refresh_token: session.data.session!.refresh_token,
    });
    expect(refreshed.error).toBeNull();
    const token = refreshed.data.session!.access_token;
    expect((await second.auth.getUser(token)).data.user?.id).toBe(secondId);
    expect((await second.auth.signOut({ scope: "local" })).error).toBeNull();
    expect((await second.auth.getUser(token)).error).not.toBeNull();
    expect((await second.auth.getSession()).data.session).toBeNull();
  });
});
