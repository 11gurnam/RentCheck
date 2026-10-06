import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { cleanupReviewUser } from "../helpers/review-cleanup";
import sharp from "sharp";
const c = localBackendConfiguration();
if (!c) throw new Error("Local test backend required");
it("serializes repeated tenancy reviews, keeps historic manager, enforces author controls and deletion", async () => {
  const admin = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const clients: (typeof admin)[] = [];
  const users: string[] = [];
  let ownedProperty: string | undefined;
  const photoPaths: string[] = [];
  try {
    for (let n = 0; n < 2; n++) {
      const email = "review-" + crypto.randomUUID() + "@example.test";
      const password = "Synthetic review integration password";
      const u = await admin.auth.admin.createUser({
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
      property: "20000000-0000-4000-8000-000000000001",
      start: "2024-01-01",
      end: "2024-12-01",
      current: false,
      paid: 15000,
      propertyRating: 4,
      managerRating: 2,
      body: "Synthetic historic tenancy review.",
      woman: true,
      recommend: true,
      synthetic: true,
    };
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        clients[0].rpc("create_review", { p_input: input }),
      ),
    );
    expect(results.every((r) => !r.error)).toBe(true);
    expect(results.filter((r) => r.data.status === "created")).toHaveLength(1);
    const id = results[0].data.id;
    expect(new Set(results.map((r) => r.data.id)).size).toBe(1);
    const jpeg = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "green" },
    })
      .jpeg()
      .toBuffer();
    const photoIds = Array.from({ length: 4 }, () => crypto.randomUUID());
    for (const photo of photoIds) {
      const path = id + "/" + photo + ".jpg";
      photoPaths.push(path);
      expect(
        (
          await admin.storage
            .from("review-photos")
            .upload(path, jpeg, { contentType: "image/jpeg" })
        ).error,
      ).toBeNull();
    }
    const registrations = await Promise.all(
      photoIds.map((photo) =>
        admin.rpc("register_review_photo", {
          p_user: users[0],
          p_review: id,
          p_photo: photo,
        }),
      ),
    );
    expect(registrations.filter((r) => !r.error)).toHaveLength(3);
    const accepted = photoIds[registrations.findIndex((r) => !r.error)];
    expect(
      (await clients[1].rpc("remove_review_photo", { p_photo: accepted })).error
        ?.code,
    ).toBe("42501");
    expect(
      (await clients[0].rpc("remove_review_photo", { p_photo: accepted }))
        .error,
    ).toBeNull();
    expect(
      (await admin.rpc("get_photo_path", { p_photo: accepted })).data,
    ).toBeNull();
    expect(
      (
        await clients[0].rpc("create_review", {
          p_input: { ...input, start: "2024-02-01" },
        })
      ).data.status,
    ).toBe("overlap");
    const feed = await clients[0].rpc("get_review_feed", {
      p_property: input.property,
    });
    expect(feed.data.find((r: { id: string }) => r.id === id).landlord_id).toBe(
      "10000000-0000-4000-8000-000000000004",
    );
    expect(JSON.stringify(feed.data)).not.toContain(users[0]);
    expect(
      (await clients[1].rpc("edit_review", { p_review: id, p_input: input }))
        .error,
    ).not.toBeNull();
    expect(
      (await clients[1].rpc("delete_review", { p_review: id })).error,
    ).not.toBeNull();
    expect(
      (await clients[0].from("reviews").select("tenancy_id")).error,
    ).not.toBeNull();
    expect(
      (
        await clients[0].rpc("edit_review", {
          p_review: id,
          p_input: { ...input, start: "2024-01-02" },
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await clients[0].rpc("edit_review", {
          p_review: id,
          p_input: {
            ...input,
            propertyRating: 5,
            body: "Synthetic updated review text.",
          },
        })
      ).error,
    ).toBeNull();
    expect(
      (await clients[0].rpc("delete_review", { p_review: id })).error,
    ).toBeNull();
    expect(
      (
        await clients[0].rpc("get_review_feed", { p_property: input.property })
      ).data.some((r: { id: string }) => r.id === id),
    ).toBe(false);
    expect(
      (await clients[0].rpc("create_review", { p_input: input })).data.status,
    ).toBe("exists");
    expect(
      (
        await clients[0].storage
          .from("review-photos")
          .upload("bypass.jpg", new Uint8Array([1, 2, 3]), {
            contentType: "image/jpeg",
          })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await clients[0].rpc("register_review_photo", {
          p_user: users[0],
          p_review: id,
          p_photo: crypto.randomUUID(),
        })
      ).error,
    ).not.toBeNull();
    const owned = await clients[0].rpc("create_property", {
      p_input: {
        name: "Synthetic owned review fixture",
        address: "Fictional lane " + crypto.randomUUID(),
        state: "Delhi",
        city: "Review fixture city",
        locality: "Fixture area",
        type: "Flat",
        min: 1000,
        max: 2000,
        synthetic: true,
        declaredOwner: true,
      },
    });
    expect(owned.error).toBeNull();
    ownedProperty = owned.data;
    expect(
      (
        await clients[0].rpc("create_review", {
          p_input: { ...input, property: ownedProperty, managerRating: "" },
        })
      ).error?.code,
    ).toBe("42501");
  } finally {
    if (photoPaths.length)
      expect(
        (await admin.storage.from("review-photos").remove(photoPaths)).error,
      ).toBeNull();
    for (const user of users) {
      cleanupReviewUser(user);
      expect((await admin.auth.admin.deleteUser(user)).error).toBeNull();
    }
    if (ownedProperty)
      expect(
        (await admin.from("properties").delete().eq("id", ownedProperty)).error,
      ).toBeNull();
  }
});
