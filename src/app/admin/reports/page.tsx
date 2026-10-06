import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { ReportCard, type Report } from "@/features/moderation/forms";
export default async function ReportsPage() {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return (
      <AccountShell>
        <h1>Access restricted.</h1>
      </AccountShell>
    );
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_reports");
  if (error) throw new Error("Reports unavailable");
  return (
    <AccountShell>
      <h1>Review reports</h1>
      <p>
        Reports leave experiences visible pending investigation. Keep/remove
        decisions require reasons and retain private audit. Deleted or removed
        records are never republished by a keep decision.
      </p>
      {!(data as Report[]).length && <p>No reports yet.</p>}
      {(data as Report[]).map((r) => (
        <ReportCard key={r.id} r={r} />
      ))}
    </AccountShell>
  );
}
