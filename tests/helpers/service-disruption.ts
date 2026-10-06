import { execFileSync } from "node:child_process";
import { localBackendConfiguration } from "./local-backend";
export function disruptReviewFeed(disrupted: boolean) {
  if (!localBackendConfiguration())
    throw new Error("Only isolated loopback backend may be disrupted");
  const sql = disrupted
    ? "revoke execute on function public.get_review_page(uuid,uuid,integer) from anon,authenticated;"
    : "grant execute on function public.get_review_page(uuid,uuid,integer) to anon,authenticated;";
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_rentcheck-accounts-test",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { stdio: "pipe" },
  );
}
