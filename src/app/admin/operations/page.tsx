import { AdminContent as AccountShell } from "@/features/admin-platform/content";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { CleanupForm } from "@/features/operations/cleanup-form";
import { ActionIcon } from "@/components/ui/action-feedback";
export default async function OperationsPage() {
  await requireUser("/admin");
  if (!(await isAdministrator())) return <AccountShell><h1>Access restricted.</h1></AccountShell>;
  const { data, error } = await (await createDatabaseClient()).rpc("operations_health");
  if (error) throw new Error("Operation status unavailable");
  const pending = Number(data.pending_media_purges), expired = Number(data.expired_evidence);
  const oldest = data.oldest_purge_at ? new Intl.DateTimeFormat("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"Asia/Kolkata" }).format(new Date(data.oldest_purge_at)) : null;
  return <AccountShell>
    <header className="admin-page-heading operations-heading"><div><p className="eyebrow">PLATFORM OPERATIONS</p><h1>Settings & Operations</h1><p>Monitor evidence retention and keep stored media up to date.</p></div><span className="semantic-status status-success"><ActionIcon name="check"/>Database available</span></header>
    <dl className="operations-stats">
      <div className="operations-stat"><dt><ActionIcon name="plus"/>Intake mode</dt><dd className="operations-mode">{data.mode.accepts_real_data ? "Real-data intake" : "Demonstration intake"}</dd><dd className="operations-note">{data.mode.accepts_real_data ? "Real contributions are enabled." : "Fictional examples are accepted."}</dd></div>
      <div className="operations-stat"><dt><ActionIcon name="shield"/>Evidence retention</dt><dd>{data.mode.evidence_retention_days}<span> days</span></dd><dd className="operations-note">Applies to new uploads.</dd></div>
      <div className={`operations-stat ${pending ? "operations-attention" : ""}`}><dt><ActionIcon name="trash"/>Queued cleanup jobs</dt><dd>{pending.toLocaleString("en-IN")}</dd><dd className="operations-note">{pending ? "Stored media awaiting cleanup." : "No jobs waiting."}</dd></div>
      <div className="operations-stat"><dt><ActionIcon name={expired ? "warning" : "check"}/>Expired evidence</dt><dd>{expired.toLocaleString("en-IN")}</dd><dd className="operations-note">{expired ? "Awaiting removal from storage." : "No expired evidence awaiting removal."}</dd></div>
    </dl>
    <section className="dashboard-card operations-cleanup"><header className="operations-section-heading"><div><h2>Media cleanup</h2><p>Remove expired evidence and retired photos, and retry queued account-deletion cleanup.</p></div><span className={`semantic-status ${pending || expired ? "status-warning" : "status-success"}`}><ActionIcon name={pending || expired ? "warning" : "check"}/>{pending || expired ? "Cleanup pending" : "Queue clear"}</span></header>
      <div className="operations-queue-info"><span>Oldest queued job</span>{oldest ? <time dateTime={data.oldest_purge_at}>{oldest} <small>IST</small></time> : <strong>No queued jobs</strong>}</div>
      <p className="operations-notice"><ActionIcon name="warning"/><span>Cleanup permanently removes eligible stored files. Verification decisions and audit history are retained.</span></p>
      <CleanupForm/>
    </section>
    <section className="dashboard-card operations-policy"><h2>Retention & access</h2><div className="operations-policy-grid"><div><h3>Expired evidence stays private</h3><p>Downloads are blocked as soon as evidence expires, even while storage cleanup is pending.</p></div><div><h3>Changes apply to future uploads</h3><p>Evidence retention settings apply to new uploads. Backups follow a separate operator retention policy.</p></div></div><details><summary>Intake settings & backup administration</summary><p>Intake settings and encrypted backup/restore checks are managed through the documented operator commands. Deployment is managed separately.</p></details></section>
  </AccountShell>;
}
