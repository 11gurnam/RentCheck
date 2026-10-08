import type { Property } from "./data";
import { money } from "./filters";
export function PropertyCard({ property: p }: { property: Property }) {
  return (
    <article className="property-card">
      <div className="property-art" aria-hidden="true">
        <span>{p.property_type}</span>
        <svg viewBox="0 0 160 100" fill="none"><path d="M30 86V43L65 15l35 28v43Z" fill="#fffdf7" stroke="currentColor" strokeWidth="3" /><path d="M56 86V60h19v26M100 86h30V50h-30M40 45h13v13H40M110 60h10v12h-10" stroke="currentColor" strokeWidth="3" /><circle cx="125" cy="19" r="9" fill="#d8bc76" /><path d="M17 86h128" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      </div>
      <div className="property-card-body">
        <p className="eyebrow">
          {p.city} · {p.locality}
        </p>
        <h2>
          <a className="property-card-link" href={`/properties/${p.id}`}>{p.name}</a>
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
        <a className="property-photo-link" href={`/properties/${p.id}#photos`}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5 10 2h4l2 3h5v15H3V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /></svg>Add photos</a>
      </div>
    </article>
  );
}
