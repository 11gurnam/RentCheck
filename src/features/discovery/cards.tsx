import type { Property } from "./data";
import { money } from "./filters";
export function PropertyCard({ property: p }: { property: Property }) {
  return (
    <article className="property-card">
      <div className="property-art" aria-hidden="true">
        <span>{p.property_type}</span>
        <div>⌂</div>
      </div>
      <div className="property-card-body">
        <p className="eyebrow">
          {p.city} · {p.locality}
        </p>
        <h2>
          <a href={`/properties/${p.id}`}>{p.name}</a>
        </h2>
        <p>{p.address}</p>
        <p className="rent">
          {money(p.rent_min)}–{money(p.rent_max)} <small>/ month</small>
        </p>
        <p className="field-hint">
          {p.landlord_name ?? "Manager not recorded"}
        </p>
        <p className="field-hint">
          {p.property_rating == null
            ? "No tenant ratings yet"
            : p.property_rating +
              " / 5 · " +
              p.review_count +
              " property ratings"}
        </p>
        <p className="field-hint">
          {p.positive_count ?? 0}/{p.eligible_count ?? 0} eligible women’s
          positive responses ·{" "}
          {p.recommended ? "Recommended" : "Threshold not reached"}
        </p>
        {p.is_demo && <span className="demo-tag">Synthetic example</span>}
      </div>
    </article>
  );
}
