import Link from "next/link";
import { womenAdminSummary } from "./data";

export async function WomenProgramAdminSummary() {
  const data = await womenAdminSummary();
  const items = [
    ["Program participants", data.enrolled],
    ["Verified women tenants", data.verified],
    ["Eligible property contributions", data.contributions],
    ["Pending residence checks", data.pending],
    ["Flagged reviews", data.flagged],
    ["Open review reports", data.reports],
  ] as const;
  return (
    <section className="dashboard-card women-admin-panel">
      <h2>Women Tenant Recommendation Program</h2>
      <p className="field-hint">Verified tenant and contribution totals exclude demonstrations. Individual enrollment and gender choices are private.</p>
      <dl className="admin-metrics">
        {items.map(([label, count]) => (
          <div key={label} className="admin-metric"><dt>{label}</dt><dd>{count.toLocaleString("en-IN")}</dd></div>
        ))}
      </dl>
      <div className="review-actions">
        <Link className="review-action" href="/admin/verification-management?type=tenant&status=pending">Review residence evidence</Link>
        <Link className="review-action" href="/admin/reviews?flagged=true">Moderate flagged reviews</Link>
        <Link className="review-action" href="/admin/disputes">Investigate reports and complaints</Link>
        <Link className="review-action" href="/admin/audit">View audit history</Link>
      </div>
    </section>
  );
}
