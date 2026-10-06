import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
type Audit = {
  id: string;
  action: string;
  entity_id: string;
  reason: string;
  created_at: string;
  before_value: unknown;
  after_value: unknown;
};
export default async function AuditPage() {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return (
      <AccountShell>
        <h1>Access restricted.</h1>
      </AccountShell>
    );
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_audit");
  if (error) throw new Error("Audit unavailable");
  return (
    <AccountShell>
      <h1>Administrator audit</h1>
      <p>
        Latest200 immutable decisions and detail changes. Records remain after
        public removal.
      </p>
      {!(data as Audit[]).length && <p>No decisions yet.</p>}
      {(data as Audit[]).map((e) => (
        <section key={e.id} className="dashboard-card">
          <h2>{e.action}</h2>
          <p>{e.reason}</p>
          <p>
            {e.created_at} · {e.entity_id}
          </p>
          <p>
            Before: {JSON.stringify(e.before_value)} · After:{" "}
            {JSON.stringify(e.after_value)}
          </p>
        </section>
      ))}
    </AccountShell>
  );
}
