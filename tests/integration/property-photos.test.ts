import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
import { cleanupReviewUser } from "../helpers/review-cleanup";
const c = localBackendConfiguration();
if (!c) throw new Error("Local backend required");
it("concurrent landlord uploads enforce ten-photo limit without granting self-verification", async () => {
  const service = createClient(c.url, c.serviceKey, {
      auth: { persistSession: false },
    }),
    client = createClient(c.url, c.publicKey, {
      auth: { persistSession: false },
    });
  const email = "photo-limit-" + crypto.randomUUID() + "@example.test",
    password = "Synthetic photo limit password";
  const u = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(u.error).toBeNull();
  const user = u.data.user!.id;
  let property: string | undefined;
  const paths: string[] = [];
  try {
    expect(
      (await client.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    const p = await client.rpc("create_property", {
      p_input: {
        name: "Synthetic photo limit " + crypto.randomUUID(),
        address: "Synthetic upload lane " + crypto.randomUUID(),
        state: "Delhi",
        city: "Photo limit fixture",
        locality: "Fixture area",
        type: "Flat",
        min: 1000,
        max: 2000,
        synthetic: true,
        declaredOwner: true,
      },
    });
    expect(p.error).toBeNull();
    property = p.data;
    const ids = Array.from({ length: 11 }, () => crypto.randomUUID());
    const jpeg = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "green" },
    })
      .jpeg()
      .toBuffer();
    for (const id of ids) {
      const path = "property/" + property + "/" + id + ".jpg";
      paths.push(path);
      expect(
        (
          await service.storage
            .from("review-photos")
            .upload(path, jpeg, { contentType: "image/jpeg" })
        ).error,
      ).toBeNull();
    }
    expect(
      (
        await client.rpc("register_property_photo", {
          p_user: user,
          p_property: property,
          p_photo: ids[0],
        })
      ).error,
    ).not.toBeNull();
    const registrations = await Promise.all(
      ids.map((id) =>
        service.rpc("register_property_photo", {
          p_user: user,
          p_property: property,
          p_photo: id,
        }),
      ),
    );
    expect(registrations.filter((r) => !r.error)).toHaveLength(10);
    const list = await client.rpc("get_property_photos", {
      p_property: property,
    });
    expect(list.error).toBeNull();
    expect(list.data).toHaveLength(10);
    expect(
      list.data.every(
        (ph: { role: string; verified: boolean }) =>
          ph.role === "landlord" && !ph.verified,
      ),
    ).toBe(true);
    const accepted = ids[registrations.findIndex((r) => !r.error)];
    expect(
      (await client.rpc("remove_property_photo", { p_photo: accepted })).error,
    ).toBeNull();
    expect(
      (await service.rpc("get_photo_path", { p_photo: accepted })).data,
    ).toBeNull();
  } finally {
    if (paths.length)
      expect(
        (await service.storage.from("review-photos").remove(paths)).error,
      ).toBeNull();
    cleanupReviewUser(user);
    if (property)
      expect(
        (await service.from("properties").delete().eq("id", property)).error,
      ).toBeNull();
    expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
  }
});
