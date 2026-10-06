import { execFileSync } from "node:child_process";
import { localBackendConfiguration } from "./local-backend";
export function cleanupReviewUser(user: string) {
  if (!localBackendConfiguration() || !/^[-0-9a-f]{36}$/.test(user))
    throw new Error("Unsafe fixture cleanup");
  const sql = `begin;delete from private.verification_requests where document_id in(select id from private.documents where owner_id='${user}');delete from private.documents where owner_id='${user}'; delete from private.review_photos where review_id in(select r.id from public.reviews r join private.tenancies t on t.id=r.tenancy_id where t.user_id='${user}');delete from private.review_answers where review_id in(select r.id from public.reviews r join private.tenancies t on t.id=r.tenancy_id where t.user_id='${user}');delete from public.reviews where tenancy_id in(select id from private.tenancies where user_id='${user}');delete from private.tenancy_conflicts where user_id='${user}';delete from private.tenancies where user_id='${user}';commit;`;
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
