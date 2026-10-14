import { getVerifiedUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await getVerifiedUser())) return Response.json({ error: "Sign in required." }, { status: 401, headers });
  if (!(await isAdministrator())) return Response.json({ error: "Administrator access required." }, { status: 403, headers });
  const { data, error } = await (await createDatabaseClient()).rpc("operations_health").abortSignal(AbortSignal.timeout(3000));
  return Response.json(error ? { status: "degraded" } : data, { status: error ? 503 : 200, headers });
}
