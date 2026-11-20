import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { displayDate } from "@/lib/display-date";
import { createDatabaseClient } from "@/lib/database/server";
import { reviewPage } from "@/features/reviews/pagination";
import { rentalLabels, type RentalPreference } from "@/features/property-information/preferences";

type Row = {
  id: string; name: string; city: string; actor: string | null;
  preferences: RentalPreference[]; publicly_visible: boolean; updated_at: string;
};

export default async function RentalEligibilityAdmin({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 120) ?? "";
  const page = reviewPage(Array.isArray(params.page) ? params.page[0] : params.page);
  const { data, error } = await (await createDatabaseClient()).rpc("get_admin_rental_preferences", { p_query: q, p_page: page });
  if (error) throw new Error("Rental preference records unavailable");
  const { total, rows } = data as { total: number; rows: Row[] };
  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <h1>Rental eligibility</h1>
        <p>Review landlord-stated preferences. A statement is public only while its author is an approved representative.</p>
      </header>
      <form method="get" className="admin-search-toolbar admin-search-panel">
        <label className="admin-search-field"><span className="sr-only">Search property or city</span><input name="q" type="search" defaultValue={q} maxLength={120} placeholder="Search property or city"/></label>
        <button className="button">Search</button>
      </form>
      <p><Link className="review-action" href="/admin/audit?action=rental_preferences_updated">View Audit</Link></p>
      {rows.length ? <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Landlord-stated rental preferences">
        <table className="admin-table">
          <thead><tr>{["Property","Stated preferences","Publication","Updated","History"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{rows.map(row => (
            <tr key={`${row.id}-${row.updated_at}`}>
              <td><Link href={`/admin/properties?id=${row.id}`}>{row.name}</Link><small>{row.city}</small></td>
              <td>{rentalLabels(row.preferences).join(", ")}</td>
              <td>{row.publicly_visible ? "Published landlord statement" : "Private statement"}</td>
              <td><time dateTime={row.updated_at}>{displayDate(row.updated_at.slice(0,10))}</time><small>{row.actor ?? "Actor unavailable"}</small></td>
              <td><Link href={`/admin/audit?entity=${row.id}&action=rental_preferences_updated`}>View change history</Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div> : <p className="field-hint">No current or staged statements match. Cleared statements remain in the audit history.</p>}
      <Pagination page={page} total={total} pageSize={25} href={p => `/admin/rental-eligibility?${new URLSearchParams({ q, page: String(p) })}`}/>
    </div>
  );
}
