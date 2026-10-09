import type { Property } from "./data";
import type { ReactNode } from "react";
import { CardPhotoUpload } from "@/features/reviews/card-photo-upload";
import { money } from "./filters";
export function PropertyCard({ property: p, actions }: { property: Property; actions?: ReactNode }) {
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
            : Number(p.property_rating).toFixed(1) +
              " / 5 · " +
              p.review_count +
              " property ratings"}
        </p>
        {!!p.criterion_scores?.length && <div className="card-criterion-scores" aria-label="Average tenant criteria ratings">{p.criterion_scores.filter(c => ["water", "electricity", "cleanliness"].includes(c.criterion_key)).map(c => <span key={c.criterion_key}>{c.label} <strong>{Number(c.rating).toFixed(1)}/5</strong></span>)}</div>}
        <p className="field-hint">
          {p.positive_count ?? 0}/{p.eligible_count ?? 0} eligible women’s
          positive responses ·{" "}
          {p.recommended ? "Recommended" : "Threshold not reached"}
        </p>
        {p.is_demo && <span className="demo-tag">Synthetic example</span>}
        <div className="property-card-actions"><CardPhotoUpload property={p.id} name={p.name} />{actions}</div>
      </div>
    </article>
  );
}
