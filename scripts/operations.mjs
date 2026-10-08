import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") throw new Error("This operator helper only permits the dedicated local backend.");
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const command = process.argv[2];
if (command === "mode") {
  const real = process.argv[3] === "real", demo = process.argv[3] === "demo", days = Number(process.argv[4] ?? 90);
  if ((!real && !demo) || !Number.isInteger(days) || days < 7 || days > 365 || (real && !process.argv.includes("--confirm-real-intake"))) throw new Error("Use mode demo|real 7–365; real requires --confirm-real-intake after reviewing docs/operations.md.");
  const result = await client.rpc("configure_operation_mode", { p_real: real, p_days: days, p_reason: real ? "Operator explicitly enabled real-data intake after reviewing operation requirements." : "Operator selected fictional demonstration intake." });
  if (result.error) throw new Error("Mode configuration failed.");
  console.log("Intake mode saved: " + (real ? "real" : "demonstration") + "; new evidence retention: " + days + " days. Existing record labels were preserved.");
} else if (command === "cleanup") {
  for (let cycle = 0; cycle < 20; cycle++) {
    const evidence = await client.rpc("queue_expired_evidence", { p_limit: 100 }), photos = await client.rpc("queue_retired_photos", { p_limit: 100 });
    if (evidence.error || photos.error) throw new Error("Media queue preparation failed.");
    const result = await client.rpc("get_media_purge_jobs", { p_user: null }); if (result.error) throw new Error("Media queue unavailable.");
    if (!result.data.length) { console.log("PASS: expired evidence and retired photos queued; registered-media cleanup queue is empty."); process.exit(0); }
    for (const bucket of ["rental-documents", "review-photos"]) {
      const rows = result.data.filter(j => j.bucket === bucket); if (!rows.length) continue;
      const removed = await client.storage.from(bucket).remove(rows.map(j => j.object_path)); if (removed.error) throw new Error("Storage removal failed; durable jobs remain for retry.");
      const ack = await client.rpc("finish_media_purge", { p_jobs: rows.map(j => j.id) }); if (ack.error) throw new Error("Cleanup acknowledgement failed; retry is safe.");
    }
  }
  console.error("Cleanup reached its bounded batch limit; run it again to finish."); process.exitCode = 1;
} else throw new Error("Use mode or cleanup. Credentials and object paths are never printed.");
