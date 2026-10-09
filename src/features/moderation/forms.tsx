"use client";
import { ActionFeedback, ActionIcon, StatusBadge } from "@/components/ui/action-feedback";
import { useActionState } from "react";
import {
  reportReview,
  decideReport,
  markDistinct,
  mergeProperties,
  maintainAssociation,
  createManager,
} from "./actions";
export type Report = {
  id: string;
  review: string;
  property: string;
  body: string;
  status: string;
  review_status: string;
  reason: string;
  decision_reason: string | null;
};
export type Duplicate = {
  id: string;
  source: string;
  target: string;
  source_name: string;
  target_name: string;
  status: string;
  reason: string;
};
export type Profile = { id: string; name: string };
export type History = {
  id: string;
  property_id: string;
  landlord_id: string;
  start_date: string;
  end_date: string | null;
  manager_name?: string;
};
export type Preview = {
  profiles: (Profile & {
    address: string;
    description: string;
    rent_min: number;
    rent_max: number;
  })[];
  reviews: {
    id: string;
    property: string;
    alias: string;
    start: string;
    end: string | null;
    status: string;
    body: string;
  }[];
  claims: { id: string; property: string; alias: string; status: string }[];
  associations: History[];
};
function Reason({ label = "Decision reason" }: { label?: string }) {
  return (
    <label>
      {label}
      <textarea name="reason" required minLength={10} maxLength={2000} />
    </label>
  );
}
export function ReportForm({ review }: { review: string }) {
  const [s, a, p] = useActionState(reportReview, {});
  return (
    <details>
      <summary><ActionIcon name="warning" /> Report this review</summary>
      <form
        action={a}
        className="auth-form"
        onReset={(e) => e.preventDefault()}
      >
        <input name="review" value={review} type="hidden" />
        <Reason label="Report reason" />
        <button disabled={p}><ActionIcon name="check" />Submit report</button>
        <ActionFeedback message={s.message} status={s.status} />
      </form>
    </details>
  );
}
export function ReportCard({ r }: { r: Report }) {
  const [s, a, p] = useActionState(decideReport, {});
  return (
    <section className="dashboard-card">
      <h2>{r.property}</h2>
      <p>{r.body}</p>
      <p>Report: {r.reason}</p>
      <p>
        <StatusBadge status={r.status} /> · review <StatusBadge status={r.review_status} />
      </p>
      <p>{r.decision_reason}</p>
      {r.status === "pending" && (
        <form
          action={a}
          className="auth-form"
          onReset={(e) => e.preventDefault()}
        >
          <input type="hidden" name="report" value={r.id} />
          <label>
            Report decision
            <select name="decision">
              <option value="kept">Keep review</option>
              <option value="removed">Remove review</option>
            </select>
          </label>
          <Reason />
          <button disabled={p}><ActionIcon name="save" />Save report decision</button>
        </form>
      )}
      <ActionFeedback message={s.message} status={s.status} />
    </section>
  );
}
export function DuplicateCard({ d }: { d: Duplicate }) {
  const [s, a, p] = useActionState(markDistinct, {});
  return (
    <section className="dashboard-card">
      <h2>
        {d.source_name} / {d.target_name}
      </h2>
      <p>
        {d.status} · {d.reason}
      </p>
      {d.status === "pending" && (
        <>
          <a href={"/admin/merge?source=" + d.source + "&target=" + d.target}>
            Inspect merge resolutions
          </a>
          <form
            action={a}
            className="auth-form"
            onReset={(e) => e.preventDefault()}
          >
            <input type="hidden" name="candidate" value={d.id} />
            <Reason />
            <button disabled={p}><ActionIcon name="check" />Keep profiles distinct</button>
          </form>
        </>
      )}
      <ActionFeedback message={s.message} status={s.status} />
    </section>
  );
}
export function MergeForm({
  source,
  target,
  preview,
}: {
  source: string;
  target: string;
  preview: Preview;
}) {
  const [s, a, p] = useActionState(mergeProperties, {});
  return (
    <form action={a} className="auth-form" onReset={(e) => e.preventDefault()}>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="target" value={target} />
      <p>
        The target profile survives; the source becomes an archive. Saves are
        deduplicated onto the target. All unselected reviews and claims move to
        the target. Resolve conflicting tenancies and representatives below;
        unresolved conflicts refuse the entire transaction.
      </p>
      <label>
        Profile details to retain
        <select name="details" required defaultValue="">
          <option value="" disabled>
            Choose explicitly
          </option>
          <option value="target">Keep target details</option>
          <option value="source">Use source details</option>
        </select>
      </label>
      <label>
        Active management history to retain
        <select name="history" required defaultValue="">
          <option value="" disabled>
            Choose explicitly
          </option>
          <option value="target">Keep target history</option>
          <option value="source">Use source history</option>
        </select>
      </label>
      <fieldset>
        <legend>Reviews to archive as conflict losers</legend>
        <p>
          Select only deliberate losers. Unselected overlapping/repeated
          tenancies refuse the merge. Archived records and their evidence remain
          private; historic manager snapshots stay fixed.
        </p>
        {preview.reviews.map((r) => (
          <label key={r.id}>
            <input type="checkbox" name="archive" value={r.id} />
            {r.property === source ? "Source" : "Target"} · {r.alias} ·{" "}
            {r.start} → {r.end ?? "Current"} · {r.status}
            <span>{r.body}</span>
          </label>
        ))}
        {!preview.reviews.length && <p>No tenancy records.</p>}
      </fieldset>
      <fieldset>
        <legend>Active claims to revoke explicitly</legend>
        {preview.claims.map((c) => (
          <label key={c.id}>
            <input type="checkbox" name="revoke" value={c.id} />
            {c.property === source ? "Source" : "Target"} · {c.alias} ·{" "}
            {c.status}
          </label>
        ))}
        {!preview.claims.length && <p>No active claims.</p>}
      </fieldset>
      <Reason label="Merge decision reason" />
      <label>
        <input type="checkbox" name="confirm" required />I reviewed both
        fictional profiles and these explicit resolutions.
      </label>
      <ActionFeedback status="warning" message="Merging archives the source profile and moves its records. Review the selected removals and revoked claims before continuing." />
      <button className="action-danger" disabled={p}><ActionIcon name="warning" />Merge with these resolutions</button>
      <ActionFeedback message={s.message} status={s.status} />
    </form>
  );
}
export function AssociationForm({
  property,
  managers,
  history,
}: {
  property: string;
  managers: Profile[];
  history: History[];
}) {
  const [s, a, p] = useActionState(maintainAssociation, {});
  return (
    <form action={a} className="auth-form" onReset={(e) => e.preventDefault()}>
      <input name="property" type="hidden" value={property} />
      <label>
        Manager
        <select name="landlord" required>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Start date
        <input name="start" type="date" required />
      </label>
      <label>
        Exclusive end date (optional)
        <input name="end" type="date" />
      </label>
      <label>
        Association to replace
        <select name="replace">
          <option value="">Add a new period</option>
          {history.map((h) => (
            <option key={h.id} value={h.id}>
              {h.start_date} → {h.end_date ?? "Ongoing"}
            </option>
          ))}
        </select>
      </label>
      <Reason label="Association change reason" />
      <button disabled={p}><ActionIcon name="save" />Save management period</button>
      <ActionFeedback message={s.message} status={s.status} />
    </form>
  );
}
export function ManagerForm() {
  const [s, a, p] = useActionState(createManager, {});
  return (
    <form action={a} className="auth-form" onReset={(e) => e.preventDefault()}>
      <label>
        Fictional manager name
        <input name="name" required minLength={3} maxLength={120} />
      </label>
      <label>
        Manager description
        <textarea name="description" maxLength={3000} />
      </label>
      <Reason label="Manager creation reason" />
      <label>
        <input type="checkbox" name="synthetic" required />
        This manager information is entirely invented.
      </label>
      <label>
        <input type="checkbox" name="acknowledged" />I reviewed the existing
        manager profiles and acknowledge any similar names.
      </label>
      <button disabled={p}><ActionIcon name="check" />Create fictional manager</button>
      <ActionFeedback message={s.message} status={s.status} />
    </form>
  );
}
