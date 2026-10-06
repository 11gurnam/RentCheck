import { it, expect } from "vitest";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { cleanupReviewUser } from "../helpers/review-cleanup";
import { fixtureAdmin } from "../helpers/admin-fixture";
const c = localBackendConfiguration();
if (!c) throw new Error("Isolated backend required");
it("real claim evidence, historical reply scopes, self-review conflicts and revocation", async () => {
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const clients: (typeof service)[] = [];
  const users: string[] = [];
  const paths: string[] = [];
  const property = "20000000-0000-4000-8000-000000000001";
  const historic = "10000000-0000-4000-8000-000000000004";
  try {
    for (let n = 0; n < 3; n++) {
      const email = "claim-api-" + crypto.randomUUID() + "@example.test",
        password = "Synthetic claim password";
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
    fixtureAdmin(users[2], true);
    const input = {
      property,
      start: "2021-01-01",
      end: "2022-01-01",
      current: false,
      paid: 15000,
      propertyRating: 4,
      managerRating: 3,
      body: "Synthetic historical tenant review for claim permissions.",
      synthetic: true,
    };
    const review = await clients[1].rpc("create_review", { p_input: input });
    expect(review.error).toBeNull();
    const jpeg = await sharp({
      create: { width: 320, height: 240, channels: 3, background: "white" },
    })
      .jpeg()
      .toBuffer();
    async function claim(user: number, p: string | null, l: string | null) {
      const doc = crypto.randomUUID(),
        path = "claim/" + doc + ".jpg";
      paths.push(path);
      expect(
        (
          await service.storage
            .from("rental-documents")
            .upload(path, jpeg, { contentType: "image/jpeg" })
        ).error,
      ).toBeNull();
      const args = {
        p_user: users[user],
        p_property: p,
        p_landlord: l,
        p_document: doc,
      };
      expect(
        (await clients[user].rpc("register_claim_document", args)).error,
      ).not.toBeNull();
      const r = await service.rpc("register_claim_document", args);
      expect(r.error).toBeNull();
      expect(
        (
          await clients[user].rpc("get_authorized_document", {
            p_document: doc,
          })
        ).data,
      ).toBe(path);
      expect(
        (await clients[2].rpc("get_authorized_document", { p_document: doc }))
          .data,
      ).toBe(path);
      expect(
        (
          await clients[1 - user].rpc("get_authorized_document", {
            p_document: doc,
          })
        ).data,
      ).toBeNull();
      return r.data;
    }
    const cid = await claim(0, null, historic);
    const reply = {
      p_claim: cid,
      p_review: review.data.id,
      p_body: "Synthetic manager response, separate from the tenant review.",
    };
    expect(
      (await clients[0].rpc("upsert_claimant_reply", reply)).error?.code,
    ).toBe("42501");
    const decision = {
      p_claim: cid,
      p_decision: "approved",
      p_reason: "Synthetic administrator claim evidence checked",
    };
    expect((await clients[0].rpc("decide_claim", decision)).error?.code).toBe(
      "42501",
    );
    expect((await clients[2].rpc("decide_claim", decision)).error).toBeNull();
    expect(
      (await clients[0].rpc("upsert_claimant_reply", reply)).error,
    ).toBeNull();
    const later = await clients[1].rpc("create_review", {
      p_input: { ...input, start: "2025-02-01", end: "2025-03-01" },
    });
    expect(later.error).toBeNull();
    expect(
      (
        await clients[0].rpc("upsert_claimant_reply", {
          ...reply,
          p_review: later.data.id,
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (await clients[0].rpc("create_review", { p_input: input })).error?.code,
    ).toBe("42501");
    const conflict = await claim(1, property, null);
    expect(
      (await clients[2].rpc("decide_claim", { ...decision, p_claim: conflict }))
        .error?.message,
    ).toContain("visible tenant reviews");
    expect(
      (
        await clients[0].rpc("update_claimed_details", {
          p_claim: cid,
          p_input: {
            name: "Injected",
            description: "",
            reason: "Synthetic injection attempt",
            status: "published",
          },
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await clients[0].rpc("update_claimed_details", {
          p_claim: cid,
          p_input: {
            name: "Injected",
            reason: "Synthetic wrong rent attempt",
            min: 1,
            max: 2,
          },
        })
      ).error,
    ).not.toBeNull();
    const anon = createClient(c.url, c.publicKey, {
      auth: { persistSession: false },
    });
    expect(
      (await anon.rpc("get_claimant_replies", { p_review: review.data.id }))
        .data,
    ).toHaveLength(1);
    expect((await anon.from("replies").select("*")).error).not.toBeNull();
    expect(
      (
        await clients[2].rpc("decide_claim", {
          ...decision,
          p_decision: "revoked",
        })
      ).error,
    ).toBeNull();
    expect(
      (await clients[0].rpc("upsert_claimant_reply", reply)).error?.code,
    ).toBe("42501");
    expect(
      (await anon.rpc("get_claimant_replies", { p_review: review.data.id }))
        .data,
    ).toHaveLength(0);
    expect(
      (await anon.rpc("get_review_feed", { p_property: property })).data.find(
        (r: { id: string }) => r.id === review.data.id,
      ).body,
    ).toBe(input.body);
    const raceProperty = "20000000-0000-4000-8000-000000000008";
    const racingClaim = await claim(0, raceProperty, null);
    const [approval, submission] = await Promise.all([
      clients[2].rpc("decide_claim", { ...decision, p_claim: racingClaim }),
      clients[0].rpc("create_review", {
        p_input: { ...input, property: raceProperty, managerRating: null },
      }),
    ]);
    expect(Number(!approval.error) + Number(!submission.error)).toBe(1);
  } finally {
    if (paths.length)
      await service.storage.from("rental-documents").remove(paths);
    for (const user of users) {
      cleanupReviewUser(user);
      expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    }
  }
});
