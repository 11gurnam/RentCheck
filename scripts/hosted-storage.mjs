import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { checkDeploymentEnvironment } from "./lib/deployment-environment.mjs";
if (!process.argv.includes("--confirm-hosted-storage")) throw new Error("Review the intended staging project, then pass --confirm-hosted-storage.");
const env = parseEnv(readFileSync(".env.hosted.local", "utf8"));
if (checkDeploymentEnvironment(env).length) throw new Error("Hosted environment incomplete; no private values printed.");
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
for (const [name, types] of [["review-photos", ["image/jpeg"]], ["rental-documents", ["image/jpeg", "application/pdf"]]]) {
  const existing = await service.storage.getBucket(name);
  if (existing.error && existing.error.status !== 404 && String(existing.error.statusCode) !== "404") throw new Error("Could not inspect hosted storage; no bucket settings changed.");
  const settings = { public: false, fileSizeLimit: 5242880, allowedMimeTypes: types };
  const result = existing.data ? await service.storage.updateBucket(name, settings) : await service.storage.createBucket(name, settings);
  if (result.error) throw new Error("Private storage configuration failed.");
  const verified = await service.storage.getBucket(name);
  if (verified.error || verified.data.public || Number(verified.data.file_size_limit) !== 5242880 || types.some(type => !verified.data.allowed_mime_types?.includes(type))) throw new Error("Private storage verification failed.");
}
console.log("PASS: both hosted buckets are private with bounded JPEG/PDF settings. No credentials or object paths printed.");
