"use client";
import { useState } from "react";
import type { Property } from "./data";
import { money } from "./filters";
export function PropertyComparison({ properties }: { properties: Property[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const rows = properties.filter(p => selected.includes(p.id));
  return <><fieldset className="dashboard-card"><legend>Choose up to three properties</legend>{properties.map(p => <label className="comparison-choice" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} disabled={selected.length === 3 && !selected.includes(p.id)} onChange={e => setSelected(e.target.checked ? [...selected, p.id] : selected.filter(id => id !== p.id))} />{p.name} · {p.city}</label>)}</fieldset><p role="status">{selected.length} of 3 selected.</p>{rows.length ? <div className="comparison-grid">{rows.map(p => <article className="dashboard-card" key={p.id}><h2><a href={`/properties/${p.id}`}>{p.name}</a></h2><dl><dt>Location</dt><dd>{p.locality}, {p.city}, {p.state}</dd><dt>Type</dt><dd>{p.property_type}</dd><dt>Monthly rent</dt><dd>{money(p.rent_min)}–{money(p.rent_max)}</dd><dt>Property rating</dt><dd>{p.property_rating == null ? "No ratings yet" : `${p.property_rating} / 5 (${p.review_count} ratings)`}</dd><dt>Current manager</dt><dd>{p.landlord_name ?? "Not recorded"}</dd><dt>Women's recommendation</dt><dd>{p.positive_count ?? 0}/{p.eligible_count ?? 0} eligible positive responses; {p.recommended ? "threshold reached" : "threshold not reached"}</dd><dt>Record</dt><dd>{p.is_demo ? "Fictional demonstration" : "User-contributed"}</dd></dl></article>)}</div> : <p>Select properties to compare their recorded facts.</p>}</>;
}
