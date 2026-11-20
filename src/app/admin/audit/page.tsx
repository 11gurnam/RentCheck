import { AdminSearchToolbar, activeFilterCount } from "@/features/admin-platform/search-toolbar";
import { AuditEventSummary, AuditHistory, auditLabel } from "@/features/admin-platform/audit-history";
import { AdminContent as AccountShell } from "@/features/admin-platform/content";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { reviewPage } from "@/features/reviews/pagination";
import { z } from "zod";
type Audit = {
  id: string;
  action: string;
  entity_id: string;
  reason: string | null;
  created_at: string;
  before_value: unknown;
  after_value: unknown;
  actor: string | null;
  actor_id: string | null;
};
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string; action?: string; q?:string; from?:string; to?:string }>;
}) {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return (
      <AccountShell>
        <h1>Access restricted.</h1>
      </AccountShell>
    );
  const params = await searchParams,
    page = reviewPage(params.page);
  const validEntity = z.uuid().safeParse(params.entity);
  const entity = params.entity && validEntity.success ? validEntity.data : null;
  const action = (params.action ?? "").slice(0, 100);
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_audit_search", { p_filters: {page,entity:entity??"",action,query:(params.q??"").slice(0,120),from:z.iso.date().safeParse(params.from).success?params.from:"",to:z.iso.date().safeParse(params.to).success?params.to:""} });
  if (error) throw new Error("Audit unavailable");
  const result = data as { entries: Audit[]; total: number; actions:string[] };
  const events = result.entries.map(({ before_value, after_value, entity_id, actor_id, ...event }) => ({
    ...event, before: before_value, after: after_value, entityId: entity_id, actorId: actor_id,
  }));
  function href(n: number) {
    const q = new URLSearchParams({ page: String(n) });
    if (entity) q.set("entity", entity);
    if (action) q.set("action", action);
    for(const key of ["q","from","to"] as const)if(params[key])q.set(key,params[key]);
    return "/admin/audit?" + q;
  }
  return (
    <AccountShell>
      <header className="admin-page-heading">
        <h1>Administrator audit</h1>
        <p>Records of administrator decisions and changes remain available after public removal.</p>
      </header>
      <AdminSearchToolbar action="/admin/audit" query={params.q ?? ""} title="Filter audit records" count={activeFilterCount(params)} searchLabel="Search action, reason, administrator or record" placeholder="Search decisions, reasons or administrators…">
        <label>Recorded from<input name="from" type="date" defaultValue={params.from}/></label>
        <label>Recorded to<input name="to" type="date" defaultValue={params.to}/></label>
        <label>
          Record ID filter (optional)
          <input
            name="entity"
            defaultValue={params.entity}
            placeholder="Paste a property, review or claim ID"
          />
        </label>
        <label>
          Action filter
          <select name="action" defaultValue={action}>
            <option value="">All decisions</option>
            {result.actions.map((a) => (
              <option key={a} value={a}>
                {auditLabel(a)}
              </option>
            ))}
          </select>
        </label>
      </AdminSearchToolbar>
      {params.entity && !validEntity.success && (
        <p role="alert">
          Invalid record ID; showing the selected action across all records.
        </p>
      )}
      <div className="audit-results-heading">
        <p className="admin-results-summary"><strong>{result.total.toLocaleString("en-IN")}</strong> matching records · Page {page}</p>
        <AuditHistory events={events} title="Administrator audit history"/>
      </div>
      {events.length > 0 ? (
        <ul className="dashboard-card audit-results">
          {events.map((event) => (
            <li key={event.id}>
              <AuditEventSummary event={event}/>
              <span className="audit-event-meta">Record ID {event.entityId}</span>
            </li>
          ))}
        </ul>
      ) : <p className="field-hint">No audit records match this page.</p>}
      <nav aria-label="Audit pages" className="pagination">
        {page > 1 && <a href={href(page - 1)}>Previous audit page</a>}
        {page * 50 < result.total && (
          <a href={href(page + 1)}>Next audit page</a>
        )}
      </nav>
    </AccountShell>
  );
}
