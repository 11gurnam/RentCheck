import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error("Isolated local backend required");
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
for (const [name, mimes] of [["review-photos", ["image/jpeg"]]]) {
  const { data, error } = await db.storage.getBucket(name);
  if (!data) {
    if (error?.message && !/not found/i.test(error.message))
      throw new Error("Storage unavailable");
    const { error: e } = await db.storage.createBucket(name, {
      public: false,
      fileSizeLimit: 5242880,
      allowedMimeTypes: mimes,
    });
    if (e) throw new Error("Bucket creation failed");
  }
}
console.log("Private review photo bucket ready.");
