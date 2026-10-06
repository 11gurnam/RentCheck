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
        <p className="field-hint">No tenant ratings yet</p>
        {p.is_demo && <span className="demo-tag">Synthetic example</span>}
      </div>
    </article>
  );
}
