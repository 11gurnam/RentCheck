import { createDatabaseClient } from "@/lib/database/server";
import { getPublicEnvironment } from "@/lib/environment";
export async function GET() {
  let available = false;
  try {
    const env = getPublicEnvironment();
    if (env) {
      const [database, auth] = await Promise.all([
        (await createDatabaseClient()).rpc("get_operation_mode").abortSignal(AbortSignal.timeout(3000)),
        fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, cache: "no-store", signal: AbortSignal.timeout(3000) }),
      ]);
      available = !database.error && !!database.data && auth.ok;
    }
  } catch { available = false; }
  return Response.json({ status: available ? "ok" : "degraded" }, { status: available ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
