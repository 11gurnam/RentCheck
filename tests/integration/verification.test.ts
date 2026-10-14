import { it, expect } from "vitest";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { cleanupReviewUser } from "../helpers/review-cleanup";
import { fixtureAdmin } from "../helpers/admin-fixture";
const c = localBackendConfiguration();
if (!c) throw new Error("Isolated backend required");
it("private uploaded document authorization and administrator decisions work through real API", async () => {
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const clients: (typeof service)[] = [];
  const users: string[] = [];
  const paths: string[] = [];
  try {
    for (let n = 0; n < 2; n++) {
      const email = "verify-" + crypto.randomUUID() + "@example.test";
      const password = "Synthetic verification password";
      const u = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(u.error).toBeNull();
      users.push(u.data.user!.id);
      const client = createClient(c.url, c.publicKey, {
        auth: { persistSession: false },
      });
      expect(
        (await client.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      clients.push(client);
    }
    const input = {
      property: "20000000-0000-4000-8000-000000000008",
      start: "2025-01-01",
      current: true,
      paid: 15000,
      propertyRating: 5,
      body: "Synthetic verification integration review.",
      woman: true,
      recommend: true,
      synthetic: true,
    };
    const r = await clients[0].rpc("create_review", { p_input: input });
    expect(r.error).toBeNull();
    const id = r.data.id;
    const document = crypto.randomUUID();
    const path = "verification/" + document + ".jpg";
    paths.push(path);
    const jpeg = await sharp({
      create: { width: 400, height: 300, channels: 3, background: "white" },
    })
      .jpeg()
      .toBuffer();
    expect(
      (
        await service.storage
          .from("rental-documents")
          .upload(path, jpeg, { contentType: "image/jpeg" })
      ).error,
    ).toBeNull();
    expect(
      (
        await clients[0].rpc("register_verification_document", {
          p_user: users[0],
          p_review: id,
          p_document: document,
        })
      ).error,
    ).not.toBeNull();
    const registered = await service.rpc("register_verification_document", {
      p_user: users[0],
      p_review: id,
      p_document: document,
    });
    expect(registered.error).toBeNull();
    const request = registered.data;
    expect(
      (
        await clients[0].rpc("get_authorized_document", {
          p_document: document,
        })
      ).data,
    ).toBe(path);
    expect(
      (
        await clients[1].rpc("get_authorized_document", {
          p_document: document,
        })
      ).data,
    ).toBeNull();
    expect(
      (await clients[0].storage.from("rental-documents").download(path)).error,
    ).not.toBeNull();
    expect(
      (
        await clients[0].rpc("decide_verification", {
          p_request: request,
          p_decision: "approved",
          p_reason: "Synthetic self approval attempt",
        })
      ).error?.code,
    ).toBe("42501");
    fixtureAdmin(users[1], true);
    expect(
      (
        await clients[1].rpc("get_authorized_document", {
          p_document: document,
        })
      ).data,
    ).toBe(path);
    expect(
      (
        await clients[1].rpc("decide_verification", {
          p_request: request,
          p_decision: "approved",
          p_reason: "Synthetic administrator demonstration approval",
        })
      ).error,
    ).toBeNull();
    expect(
      (await clients[0].rpc("review_is_verified", { p_review: id })).data,
    ).toBe(true);
    const counts = await clients[0].rpc("womens_recommendation_counts", {
      p_property: input.property,
    });
    expect(counts.data[0].positive_count).toBeGreaterThanOrEqual(1);
    expect(
      (
        await clients[1].rpc("decide_verification", {
          p_request: request,
          p_decision: "revoked",
          p_reason: "Synthetic administrator demonstration revocation",
        })
      ).error,
    ).toBeNull();
    expect(
      (await clients[0].rpc("review_is_verified", { p_review: id })).data,
    ).toBe(false);
    fixtureAdmin(users[1], false);
    expect(
      (
        await clients[1].rpc("get_authorized_document", {
          p_document: document,
        })
      ).data,
    ).toBeNull();
    expect((await clients[1].rpc("get_admin_audit")).error?.code).toBe("42501");
    const anon = createClient(c.url, c.publicKey, {
      auth: { persistSession: false },
    });
    expect(
      (await anon.rpc("get_authorized_document", { p_document: document }))
        .error?.code,
    ).toBe("42501");
    expect(
      JSON.stringify(
        (await anon.rpc("get_review_feed", { p_property: input.property }))
          .data,
      ),
    ).not.toContain(document);
  } finally {
    if (paths.length)
      expect(
        (await service.storage.from("rental-documents").remove(paths)).error,
      ).toBeNull();
    for (const user of users) {
      cleanupReviewUser(user);
      expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    }
  }
});
