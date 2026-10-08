import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
// @ts-expect-error Shared Node ESM deployment utility has no TS declaration.
import { runCleanup } from "../../scripts/lib/hosted-cleanup.mjs";
const config = localBackendConfiguration();
if (!config) throw new Error("Dedicated local backend required");
it("scheduled cleanup physically deletes a registered object and acknowledges its durable job", async () => {
  const service = createClient(config!.url, config!.serviceKey, { auth: { persistSession: false } });
  const id = crypto.randomUUID(), owner = crypto.randomUUID(), path = `hosted-cleanup-fixture/${id}.jpg`;
  const sql = (statement: string) => execFileSync("docker", ["exec", "supabase_db_rentcheck-accounts-test", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", statement], { stdio: "pipe" });
  try {
    expect((await service.storage.from("review-photos").upload(path, new Uint8Array([1]), { contentType: "image/jpeg" })).error).toBeNull();
    sql(`insert into private.media_purge_queue(id,user_id,bucket,object_path) values('${id}','${owner}','review-photos','${path}');`);
    expect(await runCleanup(service)).toEqual({ complete: true });
    expect((await service.storage.from("review-photos").download(path)).error).not.toBeNull();
    const remaining = await service.rpc("get_media_purge_jobs", { p_user: owner });
    expect(remaining.error).toBeNull(); expect(remaining.data).toEqual([]);
  } finally {
    await service.storage.from("review-photos").remove([path]);
    sql(`delete from private.media_purge_queue where id='${id}' and user_id='${owner}' and object_path='${path}';`);
  }
});
