import { ActionIcon, StatusBadge } from "@/components/ui/action-feedback";
import { ActionModal } from "@/components/ui/action-modal";

export type AuditEvent = {
  id?: string;
  action: string;
  actor: string | null;
  actorId?: string | null;
  created_at: string;
  reason: string | null;
  entityId?: string;
  before?: unknown;
  after?: unknown;
};

const timestamp = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Kolkata",
});

const checkLabels: Record<string, string> = {
  readable: "Documents are readable",
  complete: "Required pages and details are complete",
  valid: "Document type and consistency are acceptable",
  identity: "Evidence supports the applicant’s connection",
  property: "Property address matches",
  period_or_authority: "Dates support tenancy or representative authority",
};

export function auditLabel(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function outcome(event: AuditEvent) {
  const after = event.after as Record<string, unknown> | null | undefined;
  for (const value of [after?.status, after?.decision, after?.outcome]) {
    if (typeof value === "string" && value) return value;
  }
  return event.action.match(/_(approved|rejected|pending|revoked|disputed|resolved|suspended)$/)?.[1];
}

function AuditValue({ value, labels }: { value: unknown; labels?: Record<string, string> }) {
  if (value === null) return <span className="field-hint">No value recorded</span>;
  if (Array.isArray(value)) return value.length ? (
    <ol className="audit-value-list">
      {value.map((item, index) => <li key={index}><AuditValue value={item}/></li>)}
    </ol>
  ) : <span className="field-hint">Empty list</span>;
  if (typeof value === "object" && value) {
    const fields = Object.entries(value);
    return fields.length ? (
      <dl className="audit-fields">
        {fields.map(([key, item]) => (
          <div key={key}><dt>{labels && Object.hasOwn(labels, key) ? labels[key] : auditLabel(key)}</dt><dd><AuditValue value={item}/></dd></div>
        ))}
      </dl>
    ) : <span className="field-hint">No fields recorded</span>;
  }
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  return <span>{value === "" ? "Empty text" : String(value)}</span>;
}

export function AuditEventSummary({ event }: { event: AuditEvent }) {
  const status = outcome(event);
  return <>
    <div className="audit-event-heading">
      <h3>{auditLabel(event.action)}</h3>
      {status && <StatusBadge status={status}>{auditLabel(status)}</StatusBadge>}
    </div>
    <div className="audit-event-meta">
      <span>{event.actor || event.actorId || "Actor unavailable"}</span>
      <time dateTime={event.created_at}>{timestamp.format(new Date(event.created_at))} IST</time>
    </div>
    {event.reason && <p className="audit-remark">{event.reason}</p>}
  </>;
}

export function AuditHistory({ events, title = "Audit history" }: { events: AuditEvent[]; title?: string }) {
  const newestFirst = [...events].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return (
    <ActionModal title={title} trigger="View Audit" dialogClassName="audit-dialog"
      triggerContent={<><ActionIcon name="shield"/>View Audit</>}>
      {newestFirst.length === 0 ? <p className="field-hint">No audit history available.</p> : (
        <ol className="audit-timeline" tabIndex={0} aria-label="Recorded audit events">
          {newestFirst.map((event, index) => (
            <li key={event.id ?? index}>
              <AuditEventSummary event={event}/>
              {event.entityId && <p className="audit-event-meta">Record ID <span>{event.entityId}</span></p>}
              {(event.before != null || event.after != null) && (
                <div className="audit-snapshots">
                  {event.before != null && <section><h4>Previous values</h4><AuditValue value={event.before}/></section>}
                  {event.after != null && (
                    <section>
                      <h4>{event.action === "evidence_checklist" ? "Recorded checks" : "New values"}</h4>
                      <AuditValue value={event.after} labels={event.action === "evidence_checklist" ? checkLabels : undefined}/>
                    </section>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </ActionModal>
  );
}
