import Link from "next/link";
import { AdminActionMenu } from "@/features/admin-platform/action-menu";
import { ActivityChart } from "@/features/admin-platform/activity-chart";
import { overview } from "@/features/admin-platform/data";
import styles from "@/features/admin-platform/overview.module.css";
import { statusLabel } from "@/features/verification-management/data";
import { WomenProgramAdminSummary } from "@/features/women-program/admin-summary";
import { displayDate } from "@/lib/display-date";

const tools = [
  ["/admin/duplicates", "Duplicate listings", "blue"],
  ["/admin/associations", "Management history", "blue"],
  ["/admin/locations", "Property locations", "blue"],
  ["/admin/rental-eligibility", "Rental eligibility", "teal"],
  ["/admin/women-recommendations", "Women recommendations", "violet"],
  ["/admin/reports", "Review and photo reports", "amber"],
  ["/admin/messages", "Message reports", "amber"],
] as const;

function Distribution({ title, rows, tone }: {
  title: string;
  rows: { label: string; count: number; tone?: string }[];
  tone: string;
}) {
  const maximum = Math.max(1, ...rows.map(row => row.count));
  return (
    <section className={`dashboard-card ${styles.chartCard}`} data-tone={tone}>
      <h2>{title}</h2>
      {rows.length ? (
        <ul className={styles.distribution}>
          {rows.map(row => (
            <li className={styles.barRow} key={row.label} data-tone={row.tone}>
              <span>{row.label.replaceAll("_", " ")}</span>
              <strong>{row.count.toLocaleString("en-IN")}</strong>
              <div className={styles.distributionTrack} aria-hidden="true">
                <span style={{ width: `${row.count / maximum * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : <p>No records yet.</p>}
    </section>
  );
}

export default async function AdminPage() {
  const data = await overview();
  const metrics = [
    ["Total properties", data.properties, "/admin/properties", "Published and suspended; merged profiles excluded", "blue"],
    ["Tenant accounts", data.tenants, "/admin/users?role=tenant", "All accounts have tenant access", "teal"],
    ["Verified tenants", data.verified_tenants, "/admin/users?verified=true", "Real residence evidence approved", "green"],
    ["Landlord accounts", data.landlords, "/admin/users?role=landlord", "Accounts that submitted a representative claim", "teal"],
    ["Verified landlords", data.verified_landlords, "/admin/users?landlord_verified=true", "At least one real property claim approved", "green"],
    ["Verified property claims", data.verified_claims, "/admin/verification-management?type=landlord&status=verified&demo=real", "Real property claims; demo approvals excluded", "green"],
    ["Pending verifications", data.pending, "/admin/verification-management?status=pending", "Tenant and landlord applications", "amber"],
    ["Published reviews", data.reviews, "/admin/reviews", "Visible reviews contributing to public ratings", "violet"],
    ["Flagged reviews", data.flagged, "/admin/reviews?flagged=true", "Distinct reviews with unresolved reports", "amber"],
    ["Open investigations", data.disputes, "/admin/disputes", "Unresolved disputes, reports and appeals", "amber"],
  ] as const;

  return (
    <div className={styles.overview}>
      <header className={styles.heading}>
        <p className="eyebrow">RentCheck administration</p>
        <h1>Platform overview</h1>
        <p>Manage places, people, evidence and moderation from one workspace.</p>
      </header>

      <div className={`admin-metrics ${styles.metrics}`}>
        {metrics.map(([label, count, href, hint, tone]) => (
          <Link key={label} href={href} className={`admin-metric ${styles.metric}`} data-tone={tone}>
            <span>{label}</span>
            <strong>{count.toLocaleString("en-IN")}</strong>
            <small>{hint}</small>
          </Link>
        ))}
      </div>

      <WomenProgramAdminSummary />

      <section className={`dashboard-card ${styles.workload}`}>
        <div>
          <h2>Review workload</h2>
          <p><strong>{data.overdue}</strong> pending applications are older than 7 days. This is an age indicator, not a promised processing deadline.</p>
          {data.oldest && <p className="field-hint">Oldest pending submission: {displayDate(data.oldest.slice(0, 10))}</p>}
        </div>
        <AdminActionMenu label="Review workload actions">
          <Link href="/admin/verification-management?status=pending&sort=oldest">Review oldest applications</Link>
          <Link className="warning-action" href="/admin/reviews?flagged=true">Moderation queue</Link>
        </AdminActionMenu>
      </section>

      <div className={styles.verificationGrid}>
        <Distribution title="Residence verification coverage" tone="green" rows={[
          { label: "Verified tenants", count: data.verified_tenants },
          { label: "Not yet verified", count: Math.max(0, data.tenants - data.verified_tenants), tone: "amber" },
        ]} />
        <Distribution title="Application decisions" tone="teal" rows={data.verification_states.map(row => ({
          ...row, label: statusLabel(row.label),
        }))} />
      </div>

      <div className={styles.activityGrid}>
        <Distribution title="Properties by city" tone="blue" rows={data.cities} />
        <section className={`dashboard-card ${styles.activityCard}`}>
          <h2>Platform activity</h2>
          <p className="field-hint">Six months of activity. Landlords are counted at their first claim, and reports when they are submitted.</p>
          <ActivityChart rows={data.trends} />
        </section>
      </div>

      <section className={`dashboard-card ${styles.tools}`}>
        <h2>Other platform tools</h2>
        <ul className={styles.toolGrid}>
          {tools.map(([href, label, tone]) => (
            <li key={href}>
              <Link href={href} className={styles.toolLink} data-tone={tone}>
                <span>{label}</span><span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
