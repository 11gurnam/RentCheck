import Link from "next/link";
import { z } from "zod";
import { Pagination } from "@/components/ui/pagination";
import { createDatabaseClient } from "@/lib/database/server";
import { reviewPage } from "@/features/reviews/pagination";
import { ratingFields, type RatingKey } from "@/features/women-program/fields";
import { WomenProgramAdminSummary } from "@/features/women-program/admin-summary";

type Ratings = Partial<Record<RatingKey, number>>;

export default async function WomenRecommendationsAdmin({ searchParams }: {
  searchParams: Promise<{ property?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;
  const propertyId = Array.isArray(params.property) ? params.property[0] : params.property;
  const property = z.uuid().safeParse(propertyId);
  const page = reviewPage(Array.isArray(params.page) ? params.page[0] : params.page);
  let result: { name: string; demo: boolean; total: number; ratings: Ratings[] } | null = null;
  if (property.success) {
    const { data, error } = await (await createDatabaseClient()).rpc("get_admin_women_property_feedback", {
      p_property: property.data, p_page: page,
    });
    if (error) throw new Error("Program feedback unavailable");
    result = data;
  }
  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <h1>Women recommendations</h1>
        <p>Monitor eligible feedback and use standard moderation and verification tools to investigate reports.</p>
      </header>
      <WomenProgramAdminSummary/>
      <section className="dashboard-card">
        <h2>Eligible feedback by property</h2>
        <p className="field-hint">Rows show category scores without reviewer identities, notes, verification documents or links to public review records.</p>
        <form method="get" className="admin-search-toolbar">
          <label className="admin-search-field"><span className="sr-only">Property ID</span><input name="property" defaultValue={propertyId} placeholder="Property ID" maxLength={36} required/></label>
          <button className="button">View feedback</button>
        </form>
        {!result && propertyId && <p role="status">{property.success ? "Property unavailable." : "Enter a valid property ID."}</p>}
        {!propertyId && <p className="field-hint">Choose a record in <Link href="/admin/properties">Properties</Link> and open its women recommendations.</p>}
        {result && <>
          <h3>{result.name}</h3>
          <p>{result.total} eligible {result.demo ? "demonstration " : ""}{result.total === 1 ? "contribution" : "contributions"}</p>
          {result.ratings.length > 0 && <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="De-identified eligible feedback">
            <table className="admin-table">
              <thead><tr>{ratingFields.map(([key,label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
              <tbody>{result.ratings.map((ratings,index) => <tr key={index}>
                {ratingFields.map(([key]) => <td key={key}>{ratings[key] == null ? "—" : `${ratings[key]} / 5`}</td>)}
              </tr>)}</tbody>
            </table>
          </div>}
          <Pagination page={page} total={result.total} pageSize={25} href={p => `/admin/women-recommendations?property=${property.data}&page=${p}`}/>
        </>}
      </section>
    </div>
  );
}
