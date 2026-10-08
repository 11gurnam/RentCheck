import { createClient } from "@supabase/supabase-js";
import { runCleanup } from "../../scripts/lib/hosted-cleanup.mjs";

export default async function (_request, context) {
  if (context?.deploy?.context !== "production" || !context.deploy.published) return new Response("Skipped outside the published production deployment.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Hosted cleanup configuration unavailable.");
  const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3000) }) },
  });
  const result = await runCleanup(service);
  if (!result.complete) throw new Error("Cleanup incomplete; durable jobs remain for the next scheduled run or administrator retry.");
  console.log("Scheduled cleanup completed; no private paths or user data logged.");
  return new Response("Cleanup completed.");
}
