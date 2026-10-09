"use client";
import { useState } from "react";
import { criteriaFor, overallRating, type CriterionRating } from "./criteria";
import { StarRating } from "./star-rating";
export function CriteriaForm({ type, initial = [] }: { type: string; initial?: CriterionRating[] }) {
  const standards = criteriaFor(type);
  const [ratings, setRatings] = useState<Record<string, string>>(() => Object.fromEntries(initial.map(c => [c.key, String(c.rating)])));
  const [custom, setCustom] = useState(() => initial.filter(c => c.custom).map(c => ({ key: c.key, label: c.label })));
  const all = [...standards, ...custom.map(c => ({ ...c, custom: true }))];
  const values = all.map(c => ({ ...c, rating: Number(ratings[c.key] || 0) }));
  const average = overallRating(values.filter(c => c.rating > 0));
  return <fieldset className="criteria-form"><legend>Rate the essentials · {type}</legend>
    <p className="field-hint">Mark 1 for poor, 5 for excellent.</p>
    <input type="hidden" name="criteria" value={JSON.stringify(values)} />
    <input type="hidden" name="propertyRating" value={average ?? 0} />
    <div className="criteria-fields">{all.map(c => <div key={c.key} className="criterion-field">
      {"custom" in c ? <label>Your criterion<input aria-label="Custom criterion name" value={c.label} required minLength={2} maxLength={60} onChange={e => setCustom(custom.map(x => x.key === c.key ? { ...x, label: e.target.value } : x))} placeholder="e.g. Parking" /></label> : <span className="criterion-label">{c.label}</span>}
      <StarRating label={c.label || "Custom criterion"} value={Number(ratings[c.key] || 0)} onChange={rating => setRatings({ ...ratings, [c.key]: String(rating) })} />
      {"custom" in c && <button type="button" className="review-action" aria-label={`Remove ${c.label || "custom criterion"}`} onClick={() => setCustom(custom.filter(x => x.key !== c.key))}>Remove</button>}
    </div>)}</div>
    <div className="criteria-footer"><button type="button" className="review-action" disabled={custom.length >= 5} onClick={() => setCustom([...custom, { key: `custom_${crypto.randomUUID()}`, label: "" }])}>+ Add your own criterion</button><output>Overall rating <strong>{average == null ? "—" : `${average.toFixed(1)} / 5`}</strong></output></div>
  </fieldset>;
}
