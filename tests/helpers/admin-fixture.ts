import { execFileSync } from "node:child_process";
import { localBackendConfiguration } from "./local-backend";
export function fixtureAdmin(user: string, granted: boolean) {
  if (!localBackendConfiguration() || !/^[-0-9a-f]{36}$/.test(user))
    throw new Error("Unsafe admin fixture");
  const sql = granted
    ? `insert into private.administrator_grants(user_id,reason) select id,'Synthetic isolated test administrator' from auth.users where id='${user}' and email like '%@example.test' on conflict(user_id) do nothing;`
    : `delete from private.administrator_grants where user_id='${user}' and exists(select 1 from auth.users where id='${user}' and email like '%@example.test');`;
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
