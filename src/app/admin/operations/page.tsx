import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { CleanupForm } from "@/features/operations/cleanup-form";
export default async function OperationsPage() {
  await requireUser("/admin");
  if (!(await isAdministrator())) return <AccountShell><h1>Access restricted.</h1></AccountShell>;
  const { data, error } = await (await createDatabaseClient()).rpc("operations_health");
  if (error) throw new Error("Operation status unavailable");
  return <AccountShell><h1>Operation status and cleanup.</h1><dl><dt>Intake mode</dt><dd>{data.mode.accepts_real_data ? "Real-data intake enabled" : "Fictional demonstration intake"}</dd><dt>Retention for new evidence</dt><dd>{data.mode.evidence_retention_days} days</dd><dt>Pending media cleanup jobs</dt><dd>{data.pending_media_purges}</dd><dt>Expired evidence awaiting cleanup</dt><dd>{data.expired_evidence}</dd><dt>Oldest queued job</dt><dd>{data.oldest_purge_at ?? "None"}</dd></dl><p>Expired evidence downloads are denied immediately. Cleanup removes stored files while keeping recorded verification decisions and immutable audit history. Retention changes apply to future uploads. Backups have a separate operator retention policy.</p><CleanupForm /><p>Intake settings and encrypted backup/restore checks use the documented operator commands. This screen does not deploy the project.</p></AccountShell>;
}
