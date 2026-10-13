import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
it("admin queue, information requests, evidence resubmission, self-approval and revocation", async () => {
  const c = localBackendConfiguration(); if (!c) throw new Error("Local backend required");
  const service = createClient(c.url, c.serviceKey, { auth: { persistSession: false } });
  const clients: (typeof service)[] = [], users: string[] = [], paths: string[] = [];
  let property: string | undefined;
  const name = "Management fixture " + crypto.randomUUID().slice(0, 8);
  const bytes = await sharp({ create: { width: 200, height: 160, channels: 3, background: "white" } }).jpeg().toBuffer();
  try {
    for (let i = 0; i < 3; i++) {
      const email = `management-${crypto.randomUUID()}@example.test`, password = "Synthetic management fixture password";
      const u = await service.auth.admin.createUser({ email, password, email_confirm: true }); expect(u.error).toBeNull(); users.push(u.data.user!.id);
      const client = createClient(c.url, c.publicKey, { auth: { persistSession: false } }); expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull(); clients.push(client);
    }
    fixtureAdmin(users[2], true);
    const p = await clients[1].rpc("create_property", { p_input: { name, address: "Synthetic management lane", state: "Delhi", city: "Synthetic city", locality: "Test area", type: "Flat", min: 1000, max: 2000, synthetic: true }, p_acknowledged: true }); expect(p.error).toBeNull(); property = p.data;
    const review = await clients[0].rpc("create_review", { p_input: { property, start: "2024-01-01", current: true, paid: 1000, propertyRating: 4, body: "Synthetic management tenant experience.", synthetic: true } }); expect(review.error).toBeNull();
    async function bundle(user: number, reviewId: string | null) {
      const id = crypto.randomUUID(), path = `${reviewId ? "verification" : "claim"}/${id}.jpg`; paths.push(path);
      expect((await service.storage.from("rental-documents").upload(path, bytes, { contentType: "image/jpeg" })).error).toBeNull();
      const r = await service.rpc("register_evidence_bundle", { p_user: users[user], p_documents: [{ id, extension: "jpg" }], p_kind: reviewId ? "lease" : "ownership", p_review: reviewId, p_property: reviewId ? null : property, p_demo: true, p_consent: true }); expect(r.error).toBeNull(); return { application: r.data as string, document: id };
    }
    const tenant = await bundle(0, review.data.id), landlord = await bundle(1, null);
    const action = { p_kind: "tenant", p_application: tenant.application, p_action: "assign", p_reason: "Synthetic administrator starts evidence review" };
    expect((await clients[0].rpc("get_verification_management")).error?.code).toBe("42501");
    expect((await clients[0].rpc("get_verification_application", { p_kind: "tenant", p_application: tenant.application })).error?.code).toBe("42501");
    expect((await clients[0].rpc("manage_verification", action)).error?.code).toBe("42501");
    expect((await clients[2].rpc("manage_verification", action)).error).toBeNull();
    const queue = await clients[2].rpc("get_verification_management", { p_query: name, p_status: "under_review", p_type: "tenant", p_sort: "oldest", p_page: 1 }); expect(queue.error).toBeNull(); expect(queue.data.total).toBe(1); expect(queue.data.rows[0].assigned_to).toBe(users[2]); expect(queue.data.rows[0].email).toBeUndefined();
    expect((await clients[2].rpc("get_verification_management", { p_query: name, p_page: 2 })).data.rows).toEqual([]);
    expect((await clients[2].rpc("manage_verification", { ...action, p_action: "request_information", p_reason: "Please include all pages showing your property address." })).error).toBeNull();
    expect((await clients[0].rpc("get_my_verification_stage", { p_kind: "tenant", p_application: tenant.application })).data).toBe("awaiting_information");
    expect((await clients[0].rpc("get_my_notifications")).data.some((n: { message: string }) => n.message.includes("Please include all pages"))).toBe(true);
    const fresh = await bundle(0, review.data.id); expect(fresh.application).toBe(tenant.application);
    expect((await clients[0].rpc("get_my_verification_stage", { p_kind: "tenant", p_application: tenant.application })).data).toBe("under_review");
    const details = await clients[2].rpc("get_verification_application", { p_kind: "tenant", p_application: tenant.application }); expect(details.data.documents[0].id).toBe(fresh.document); expect(details.data.history.some((e: { action: string }) => e.action === "verification_evidence_updated")).toBe(true); expect(details.data.email).toContain("@example.test");
    expect((await clients[2].rpc("manage_verification", { ...action, p_action: "approved", p_reason: "Synthetic residence evidence reviewed and approved" })).error).toBeNull();
    expect((await clients[0].rpc("review_is_verified", { p_review: review.data.id })).data).toBe(true);
    const la = { ...action, p_kind: "landlord", p_application: landlord.application };
    expect((await clients[2].rpc("manage_verification", { ...la, p_action: "request_information", p_reason: "Supply the complete property authority document." })).error).toBeNull();
    expect((await bundle(1, null)).application).toBe(landlord.application);
    expect((await clients[2].rpc("manage_verification", { ...la, p_action: "approved" })).error).toBeNull();
    const reply = { p_claim: landlord.application, p_review: review.data.id, p_body: "Synthetic approved property reply." }; expect((await clients[1].rpc("upsert_claimant_reply", reply)).error).toBeNull();
    expect((await clients[2].rpc("manage_verification", { ...la, p_action: "revoked", p_reason: "Synthetic invalid authority evidence requires revocation" })).error).toBeNull();
    expect((await clients[1].rpc("upsert_claimant_reply", reply)).error?.code).toBe("42501");
    expect((await clients[0].rpc("update_tenancy", { p_review: review.data.id, p_current: false, p_end: "2024-12-01", p_paid: 1000 })).error).toBeNull();
    expect((await clients[0].rpc("review_is_verified", { p_review: review.data.id })).data).toBe(false);
    expect((await clients[0].rpc("get_my_verification_stage", { p_kind: "tenant", p_application: tenant.application })).data).toBe("pending");
    const ownReview = await clients[2].rpc("create_review", { p_input: { property: "20000000-0000-4000-8000-000000000003", start: "2024-01-01", current: true, paid: 1000, propertyRating: 4, body: "Synthetic administrator own tenancy.", synthetic: true } }); expect(ownReview.error).toBeNull();
    const own = await bundle(2, ownReview.data.id);
    expect((await clients[2].rpc("decide_verification", { p_request: own.application, p_decision: "approved", p_reason: "Attempted self approval must be denied" })).error?.code).toBe("42501");
    expect((await clients[2].rpc("manage_verification", { ...action, p_application: own.application, p_action: "approved" })).error?.code).toBe("42501");
    fixtureAdmin(users[1], true);
    expect((await clients[1].rpc("decide_claim", { p_claim: landlord.application, p_decision: "approved", p_reason: "Attempted own property claim approval" })).error?.code).toBe("42501");
  } finally {
    if (paths.length) await service.storage.from("rental-documents").remove(paths);
    for (const user of users) expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    if (property) await service.from("properties").delete().eq("id", property);
  }
});
