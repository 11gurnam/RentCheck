import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { execFileSync } from "node:child_process";

it("real evidence requires all validity checks and rejection permits resubmission", async () => {
  const c = localBackendConfiguration();
  if (!c) throw new Error("Local backend required");
  const service = createClient(c.url, c.serviceKey, { auth: { persistSession: false } });
  const original = await service.rpc("get_operation_mode");
  expect(original.error).toBeNull();
  const users: string[] = [], clients: (typeof service)[] = [], paths: string[] = [];
  let property: string | undefined;
  try {
    expect((await service.rpc("configure_operation_mode", { p_real: true, p_days: 7, p_reason: "Synthetic isolated real evidence checks" })).error).toBeNull();
    for (let i = 0; i < 3; i++) {
      const email = `real-trust-${crypto.randomUUID()}@example.test`, password = "Synthetic real evidence password";
      const u = await service.auth.admin.createUser({ email, password, email_confirm: true });
      expect(u.error).toBeNull(); users.push(u.data.user!.id);
      const client = createClient(c.url, c.publicKey, { auth: { persistSession: false } });
      expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull(); clients.push(client);
    }
    fixtureAdmin(users[2], true);
    const created = await clients[1].rpc("create_property", { p_input: { name: "Synthetic real trust fixture", address: `Synthetic test address ${crypto.randomUUID()}`, state: "Delhi", city: "Test city", locality: "Test locality", type: "Flat", min: 1000, max: 2000, synthetic: false, consent: true }, p_acknowledged: true });
    expect(created.error).toBeNull(); property = created.data;
    const review = await clients[0].rpc("create_review", { p_input: { property, start: "2025-01-01", current: true, paid: 1500, propertyRating: 4, body: "Synthetic real-mode evidence test review.", synthetic: false, consent: true } });
    expect(review.error).toBeNull();
    const bytes = await sharp({ create: { width: 200, height: 150, channels: 3, background: "white" } }).jpeg().toBuffer();
    async function bundle(claim: boolean) {
      const docs = [];
      for (let i = 0; i < 2; i++) {
        const id = crypto.randomUUID(), path = `${claim ? "claim" : "verification"}/${id}.jpg`;
        paths.push(path); expect((await service.storage.from("rental-documents").upload(path, bytes, { contentType: "image/jpeg" })).error).toBeNull(); docs.push({ id, extension: "jpg" });
      }
      const result = await service.rpc("register_evidence_bundle", { p_user: users[claim ? 1 : 0], p_documents: docs, p_kind: claim ? "ownership" : "lease", p_review: claim ? null : review.data.id, p_property: claim ? property : null, p_demo: false, p_consent: true });
      expect(result.error).toBeNull(); return { request: result.data, docs };
    }
    const partial = { identity: true, property: true, period_or_authority: true };
    const complete = { ...partial, readable: true, complete: true, valid: true };
    const first = await bundle(false);
    const decision = { p_request: first.request, p_decision: "approved", p_reason: "Synthetic residence evidence inspected", p_checks: partial };
    expect((await clients[2].rpc("decide_verification", decision)).error).not.toBeNull();
    expect((await clients[0].rpc("review_is_verified", { p_review: review.data.id })).data).toBe(false);
    expect((await clients[2].rpc("decide_verification", { ...decision, p_decision: "rejected", p_reason: "Please provide a readable bill showing the property address." })).error).toBeNull();
    const second = await bundle(false);
    expect((await clients[2].rpc("decide_verification", { ...decision, p_request: second.request, p_checks: complete })).error).toBeNull();
    expect((await clients[0].rpc("review_is_verified", { p_review: review.data.id })).data).toBe(true);
    const claim = await bundle(true);
    const claimDecision = { p_claim: claim.request, p_decision: "approved", p_reason: "Synthetic ownership and authority inspected", p_checks: partial };
    expect((await clients[2].rpc("decide_claim", claimDecision)).error).not.toBeNull();
    const supplemental = claim.docs[1].id;
    expect(/^[a-f0-9-]{36}$/.test(supplemental)).toBe(true);
    execFileSync("docker", ["exec", "supabase_db_rentcheck-accounts-test", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `update private.documents set expires_at=now()-interval '1 second' where id='${supplemental}' and owner_id='${users[1]}' and exists(select 1 from auth.users where id='${users[1]}' and email like 'real-trust-%@example.test');`], { stdio: "pipe" });
    expect((await clients[2].rpc("decide_claim", { ...claimDecision, p_checks: complete })).error?.message).toContain("expired");
    execFileSync("docker", ["exec", "supabase_db_rentcheck-accounts-test", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `update private.documents set expires_at=now()+interval '7 days' where id='${supplemental}' and owner_id='${users[1]}' and exists(select 1 from auth.users where id='${users[1]}' and email like 'real-trust-%@example.test');`], { stdio: "pipe" });
    expect((await clients[2].rpc("decide_claim", { ...claimDecision, p_checks: complete })).error).toBeNull();
    expect((await clients[1].rpc("upsert_claimant_reply", { p_claim: claim.request, p_review: review.data.id, p_body: "Synthetic authorized real-mode reply." })).error).toBeNull();
    expect((await clients[0].rpc("get_claimant_replies", { p_review: review.data.id })).data[0].representative).toBe("Verified Landlord Response");
  } finally {
    expect((await service.rpc("configure_operation_mode", { p_real: original.data.accepts_real_data, p_days: original.data.evidence_retention_days, p_reason: "Restoring mode after isolated evidence test" })).error).toBeNull();
    if (paths.length) await service.storage.from("rental-documents").remove(paths);
    for (const user of users) expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    if (property) await service.from("properties").delete().eq("id", property);
  }
});
