import { AdminSearchToolbar, activeFilterCount } from "@/features/admin-platform/search-toolbar";
import { AdminContent as AccountShell } from "@/features/admin-platform/content";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { reviewPage } from "@/features/reviews/pagination";
import { z } from "zod";
type Audit = {
  id: string;
  action: string;
  entity_id: string;
  reason: string;
  created_at: string;
  before_value: unknown;
  after_value: unknown;
  actor: string | null;
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
  function href(n: number) {
    const q = new URLSearchParams({ page: String(n) });
    if (entity) q.set("entity", entity);
    if (action) q.set("action", action);
    for(const key of ["q","from","to"] as const)if(params[key])q.set(key,params[key]);
    return "/admin/audit?" + q;
  }
  return (
    <AccountShell>
      <h1>Administrator audit</h1>
      <p>
        Immutable decisions and detail changes, 50 per page. Records remain
        after public removal.
      </p>
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
                {a.replaceAll("_", " ")}
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
      <p>
        {result.total} matching records · Page {page}
      </p>
      {!result.entries.length && <p>No decisions on this page.</p>}
      {result.entries.map((e) => (
        <section key={e.id} className="dashboard-card">
          <h2>{e.action.replaceAll("_", " ")}</h2>
          <p>{e.reason}</p>
          <p>
            {e.actor??"Trusted operator / former account"} · {new Date(e.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} · {e.entity_id}
          </p>
          <details>
            <summary>Inspect previous and new values</summary>
            <pre className="audit-values">
              {JSON.stringify(
                { before: e.before_value, after: e.after_value },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      ))}
      <nav aria-label="Audit pages" className="pagination">
        {page > 1 && <a href={href(page - 1)}>Previous audit page</a>}
        {page * 50 < result.total && (
          <a href={href(page + 1)}>Next audit page</a>
        )}
      </nav>
    </AccountShell>
  );
}
