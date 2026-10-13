import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
// @ts-expect-error Shared Node ESM deployment utility has no TS declaration.
import { runCleanup } from "../../scripts/lib/hosted-cleanup.mjs";

const config = localBackendConfiguration();
if (!config) throw new Error("Dedicated local backend required");
it("account deletion queues and physically removes its private profile photo", async () => {
  const service = createClient(config!.url, config!.serviceKey, { auth: { persistSession: false } });
  const client = createClient(config!.url, config!.publicKey, { auth: { persistSession: false } });
  const email = `avatar-cleanup-${crypto.randomUUID()}@example.test`;
  const password = "Synthetic avatar cleanup password";
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const user = created.data.user!.id;
  let path: string | undefined;
  try {
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
    const account = await client.rpc("get_my_account");
    const photo = crypto.randomUUID();
    path = `${account.data[0].profile_id}/${photo}.jpg`;
    const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: "green" } }).jpeg().toBuffer();
    expect((await service.storage.from("profile-photos").upload(path, jpeg, { contentType: "image/jpeg" })).error).toBeNull();
    expect((await client.rpc("set_my_profile_photo", { p_photo: photo })).error).toBeNull();
    expect((await client.storage.from("profile-photos").download(path)).error).not.toBeNull();
    expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    const jobs = await service.rpc("get_media_purge_jobs", { p_user: user });
    expect(jobs.data).toEqual(expect.arrayContaining([expect.objectContaining({ bucket: "profile-photos", object_path: path })]));
    expect(await runCleanup(service)).toEqual({ complete: true });
    expect((await service.storage.from("profile-photos").download(path)).error).not.toBeNull();
    expect((await service.rpc("get_media_purge_jobs", { p_user: user })).data).toEqual([]);
  } finally {
    await service.auth.admin.deleteUser(user);
    if (path) await service.storage.from("profile-photos").remove([path]);
  }
});
