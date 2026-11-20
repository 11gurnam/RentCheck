import { AccountShell } from "@/components/ui/account-shell";
import { parseFilters, searchHref } from "@/features/discovery/filters";
import { getLocations, searchProperties } from "@/features/discovery/data";
import { PropertyCard } from "@/features/discovery/cards";
import { SearchControls } from "@/features/discovery/search-controls";
import { RentalPreferenceFields } from "@/features/property-information/fields";
import { Pagination } from "@/components/ui/pagination";
import { redirect } from "next/navigation";
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parseFilters(await searchParams);
  if (!parsed.success)
    return (
      <AccountShell>
        <h1>Check your filters.</h1>
        <p role="alert">{parsed.error.issues[0].message}</p>
        <a href="/search">Reset filters</a>
      </AccountShell>
    );
  const f = parsed.data;
  let rows, locations;
  try {
    [rows, locations] = await Promise.all([
      searchProperties(f),
      getLocations(),
    ]);
  } catch {
    return (
      <AccountShell>
        <h1>Find your next place.</h1>
        <div className="setup-notice" role="alert">
          We couldn’t load accommodation. Please refresh to try again.
        </div>
      </AccountShell>
    );
  }
  // Recover from stale/out-of-range links after properties or filters change.
  if(f.page>1&&!rows.length){
    const first=await searchProperties({...f,page:1});
    redirect(searchHref(f,Math.max(1,Math.ceil((first[0]?.total_count??0)/12))));
  }
  const total = rows[0]?.total_count ?? 0;
  return (
    <AccountShell>
      <header className="discovery-heading discovery-subheader">
        <p className="eyebrow">A MORE INFORMED MOVE · INDIA</p>
        <h1>Find a place. Know its story.</h1>
        <p>
          Compare rent, neighbourhoods, and tenant experiences across India. Property profiles are for research.
        </p>
      </header>
      <SearchControls key={searchHref(f, f.page)} initial={{ q: f.q, state: f.state, city: f.city, locality: f.locality, type: f.type }}
        locations={locations} otherFilterCount={[f.min > 0, f.max < 10000000, f.rating > 0, f.women, f.verification, f.eligibility.length].filter(Boolean).length}>
        <div>
          <label htmlFor="min">Minimum rent (₹)</label>
          <input
            id="min"
            name="min"
            type="number"
            min="0"
            max="10000000"
            defaultValue={f.min || ""}
          />
        </div>
        <div>
          <label htmlFor="max">Maximum rent (₹)</label>
          <input
            id="max"
            name="max"
            type="number"
            min="0"
            max="10000000"
            defaultValue={f.max === 10000000 ? "" : f.max}
          />
        </div>
        <div>
          <label htmlFor="rating">Minimum property rating</label>
          <select id="rating" name="rating" defaultValue={f.rating}>
            <option value="0">Any rating / unrated</option>
            {[3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} / 5 or higher
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="verification">RentCheck tenant verification</label>
          <select id="verification" name="verification" defaultValue={f.verification}>
            <option value="">Any verification status</option>
            <option value="reviews">Has verified tenant reviews</option>
            <option value="current">Has verified current tenants</option>
            <option value="former">Has verified previous tenants</option>
          </select>
        </div>
        <div>
          <label htmlFor="women">Women’s tenant recommendations</label>
          <select id="women" name="women" defaultValue={f.women}>
            <option value="">Any recommendation status</option>
            <option value="recommended">Recommended by verified women tenants</option>
            <option value="reviews">Has verified women tenant reviews</option>
            <option value="safety">Has women-specific safety ratings</option>
          </select>
        </div>
        <RentalPreferenceFields initial={f.eligibility} search/>
        <div className="filter-actions">
          <button className="button" type="submit">
            Apply filters
          </button>
          <a href="/search">Reset</a>
        </div>
      </SearchControls>
      <div className="results-heading">
        <h2 className="accommodation-result-count">
          {rows.length
            ? <><strong>{total}</strong><span>{total === 1 ? "place found" : "places found"}</span></>
            : "No matching places"}
        </h2>
        <span className="budget-notice"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 10 18H2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 9v5m0 3v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>{f.min > 0 || f.max < 10000000 ? "Monthly rent ranges overlap your budget" : "Monthly rent ranges · check the full range before choosing"}</span>
      </div>
      {rows.length ? (
        <div className="property-grid">
          {rows.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Try another city, a wider budget or fewer filters.</p>
          <a href="/search">View all examples</a>
        </div>
      )}
      <Pagination page={f.page} total={total} pageSize={12} href={page=>searchHref(f,page)}/>
    </AccountShell>
  );
}
