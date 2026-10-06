import { AccountShell } from "@/components/ui/account-shell";
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
};
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string; action?: string }>;
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
  ).rpc("get_audit_page", { p_page: page, p_entity: entity, p_action: action });
  if (error) throw new Error("Audit unavailable");
  const result = data as { entries: Audit[]; total: number };
  function href(n: number) {
    const q = new URLSearchParams({ page: String(n) });
    if (entity) q.set("entity", entity);
    if (action) q.set("action", action);
    return "/admin/audit?" + q;
  }
  return (
    <AccountShell>
      <h1>Administrator audit</h1>
      <p>
        Immutable decisions and detail changes, 50 per page. Records remain
        after public removal.
      </p>
      <form method="get" className="auth-form">
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
            {[
              "verification_decision",
              "claim_decision",
              "claimed_details",
              "claimant_reply",
              "report_decision",
              "property_merge",
              "merge_claim_revocation",
              "management_association",
              "duplicate_distinct",
              "manager_created",
            ].map((a) => (
              <option key={a} value={a}>
                {a.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button>Filter audit records</button>
        <a href="/admin/audit">Reset audit filters</a>
      </form>
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
          <h2>{e.action}</h2>
          <p>{e.reason}</p>
          <p>
            {e.created_at} · {e.entity_id}
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
