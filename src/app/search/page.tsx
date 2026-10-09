import { AccountShell } from "@/components/ui/account-shell";
import { parseFilters, searchHref } from "@/features/discovery/filters";
import { getLocations, searchProperties } from "@/features/discovery/data";
import { PropertyCard } from "@/features/discovery/cards";
import { SearchControls } from "@/features/discovery/search-controls";
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
  const states = [...new Set(locations.map((l) => l.state))].sort();
  const cities = [
    ...new Set(
      locations
        .filter((l) => !f.state || l.state === f.state)
        .map((l) => l.city),
    ),
  ].sort();
  const localities = [
    ...new Set(
      locations
        .filter((l) => l.city === f.city && (!f.state || l.state === f.state))
        .map((l) => l.locality),
    ),
  ].sort();
  const total = rows[0]?.total_count ?? 0;
  return (
    <AccountShell>
      <div className="discovery-heading">
        <p className="eyebrow">A MORE INFORMED MOVE · INDIA</p>
        <h1>Find a place. Know its story.</h1>
        <p>
          Explore accommodation stories across India. Synthetic research profiles.
        </p>
      </div>
      <SearchControls activeCount={[f.state, f.city, f.locality, f.type, f.min > 0, f.max < 10000000, f.rating > 0, f.women].filter(Boolean).length} search={
        <div className="search-field">
          <label htmlFor="q">Property, address or manager</label>
          <div className="discovery-search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder="Search property, address or manager…"
            maxLength={120}
          />
          </div>
        </div>
      }>
        <div>
          <label htmlFor="state">State / union territory</label>
          <select id="state" name="state" defaultValue={f.state}>
            <option value="">All states</option>
            {states.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="city">City</label>
          <select id="city" name="city" defaultValue={f.city}>
            <option value="">All cities</option>
            {cities.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="locality">Locality</label>
          <select
            id="locality"
            name="locality"
            defaultValue={f.locality}
            disabled={!f.city}
          >
            <option value="">All localities</option>
            {localities.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <small>Apply a city first to choose its locality.</small>
        </div>
        <div>
          <label htmlFor="type">Accommodation type</label>
          <select id="type" name="type" defaultValue={f.type}>
            <option value="">All types</option>
            {["Flat", "House", "PG", "Hostel", "Homestay"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
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
          <label htmlFor="women">Women’s tenant recommendations</label>
          <select id="women" name="women" defaultValue={f.women}>
            <option value="">Any status</option>
            <option value="recommended">Threshold reached</option>
          </select>
        </div>
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
            ? <><strong>{total}</strong> accommodation {total === 1 ? "example" : "examples"}</>
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
      <nav className="pagination" aria-label="Results pages">
        {f.page > 1 && <a href={searchHref(f, f.page - 1)}>Previous page</a>}
        {total > f.page * 12 && (
          <a href={searchHref(f, f.page + 1)}>Next page</a>
        )}
      </nav>
      <p className="field-hint">
        Ratings and women’s recommendations appear when eligible tenant reviews
        are available. No safety guarantee.
      </p>
    </AccountShell>
  );
}
