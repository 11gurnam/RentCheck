import { expect, it, vi } from "vitest";
// Deployment utilities also run outside the Next.js runtime.
// @ts-expect-error These small Node ESM operator utilities have no TS declaration.
import { checkDeploymentEnvironment } from "../../../scripts/lib/deployment-environment.mjs";
// @ts-expect-error These small Node ESM operator utilities have no TS declaration.
import { runCleanup } from "../../../scripts/lib/hosted-cleanup.mjs";
// @ts-expect-error Netlify Node ESM entry point has no TS declaration.
import scheduledCleanup from "../../../netlify/functions/media-cleanup.mjs";
const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_fixture",
  SITE_URL: "https://fixture.netlify.app",
  GOOGLE_AUTH_ENABLED: "false",
  OPERATOR_NAME: "Fictional test operator",
  OPERATOR_CONTACT_EMAIL: "operator@example.test",
};
it("scheduled cleanup skips preview and unpublished deployments without needing credentials", async () => {
  for (const deploy of [{ context: "deploy-preview", published: false }, { context: "production", published: false }]) {
    const result = await scheduledCleanup(undefined, { deploy });
    expect(await result.text()).toContain("Skipped");
  }
});
it("blocks local URLs, public privileged keys and missing operator contact before deployment", () => {
  expect(checkDeploymentEnvironment(valid)).toEqual([]);
  expect(checkDeploymentEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).not.toEqual([]);
  expect(checkDeploymentEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_fixture" })).not.toEqual([]);
  expect(checkDeploymentEnvironment({ ...valid, SITE_URL: "https://fixture.netlify.app/auth/callback" })).not.toEqual([]);
  expect(checkDeploymentEnvironment({ ...valid, OPERATOR_CONTACT_EMAIL: "" })).not.toEqual([]);
});
it("does not acknowledge cleanup jobs when storage removal fails", async () => {
  const rpc = vi.fn(async (name: string) => ({ error: null, data: name === "get_media_purge_jobs" ? [{ id: "test-job", bucket: "rental-documents", object_path: "verification/test.pdf" }] : null }));
  const remove = vi.fn(async () => ({ error: { message: "Private provider diagnostic" }, data: null }));
  await expect(runCleanup({ rpc, storage: { from: () => ({ remove }) } })).rejects.toThrow("queued jobs remain retryable");
  expect(rpc.mock.calls.some(([name]) => name === "finish_media_purge")).toBe(false);
});
it("rejects unknown cleanup buckets without deleting objects", async () => {
  const rpc = vi.fn(async (name: string) => ({ error: null, data: name === "get_media_purge_jobs" ? [{ id: "test-job", bucket: "unrelated", object_path: "test.jpg" }] : null }));
  const from = vi.fn();
  await expect(runCleanup({ rpc, storage: { from } })).rejects.toThrow("Unexpected media cleanup job");
  expect(from).not.toHaveBeenCalled();
});
