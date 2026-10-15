"use client";
import { useState } from "react";
import { ActionIcon } from "@/components/ui/action-feedback";
import type { Property } from "./data";
import { money } from "./filters";
import { googleMapsUrl } from "./map-url";
import { recommendationText } from "./women-recommendation";
import { InfoPopover } from "@/components/ui/info-popover";

export function PropertyComparison({ properties, initialSelected=[] }: { properties: Property[]; initialSelected?:string[] }) {
  const availableSaved=initialSelected.filter(id=>properties.some(p=>p.id===id));
  const [selected, setSelected] = useState<string[]>(initialSelected.filter(id=>properties.some(p=>p.id===id)).slice(0,3));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rows = selected.map(id => properties.find(p => p.id === id)).filter(p => p !== undefined);
  const matches = properties.filter(p => !selected.includes(p.id) && `${p.name} ${p.locality} ${p.city} ${p.state} ${p.address}`.toLowerCase().includes(query.trim().toLowerCase()));
  const remove = (id: string) => setSelected(selected.filter(value => value !== id));
  const facts = [
    { label: "Monthly rent", value: (p: Property) => <strong className="rent">{money(p.rent_min)}–{money(p.rent_max)}<small> / month</small></strong> },
    { label: "Location", value: (p: Property) => `${p.locality}, ${p.city}, ${p.state}` },
    { label: "Accommodation type", value: (p: Property) => p.property_type },
    { label: "Tenant rating", value: (p: Property) => p.property_rating == null ? "No ratings yet" : `${Number(p.property_rating).toFixed(1)} / 5 · ${p.review_count} reviews` },
    { label: "Current manager", value: (p: Property) => p.landlord_name ?? "Not recorded" },
    { label: "Landlord / management rating", value: (p: Property) => p.landlord_rating == null ? "No landlord ratings yet" : `${Number(p.landlord_rating).toFixed(1)} / 5 · ${p.landlord_review_count??0} rated reviews` },
    { label: "Map location", value: (p: Property) => p.latitude==null||p.longitude==null?"No map pin supplied":<a target="_blank" rel="noreferrer" href={googleMapsUrl(p.latitude,p.longitude)} aria-label={`Open ${p.name} in Google Maps`} title={p.precision==="approximate"?"Approximate area":"Shared property pin"}>Open in Google Maps ↗</a> },
    { label: "Women’s tenant recommendations", value: (p: Property) => recommendationText(p.positive_count??0,p.eligible_count??0,p.recommended) },
    { label: "Profile", value: (p: Property) => p.is_demo ? "Demonstration example" : "User-contributed" },
  ];
  return <div className="compare-workspace">
    <section className="compare-picker dashboard-card" aria-labelledby="compare-picker-title">
      {availableSaved.length<initialSelected.length&&<p className="field-hint">Some saved places are unavailable and aren’t included. You can add another place below.</p>}
      {!initialSelected.length&&<p className="field-hint">No shortlisted places yet. Save places while exploring, or add them below.</p>}
      {initialSelected.length>3&&<p className="field-hint">Showing your first three available saved places. Remove one to compare another.</p>}
      <div className="compare-picker-header"><div><h2 id="compare-picker-title">Choose places to compare</h2><p>Search by property name, city or neighbourhood.</p></div><span className="compare-selection-count" role="status">{rows.length} of 3 selected</span></div>
      <div className="compare-dropdown" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
        <button className="compare-dropdown-trigger" type="button" aria-expanded={open} aria-controls="compare-place-options" disabled={rows.length >= 3 || !properties.length} onClick={() => setOpen(!open)}><span>{rows.length >= 3 ? "3 places selected · remove one to add another" : "＋ Add a place"}</span><span aria-hidden="true">⌄</span></button>
        {open && <div id="compare-place-options" className="compare-dropdown-panel" onKeyDown={e => { if (e.key === "Escape") { setOpen(false); e.currentTarget.parentElement?.querySelector<HTMLButtonElement>("button")?.focus(); } }}><label htmlFor="compare-place-search">Find a place</label><input autoFocus id="compare-place-search" type="search" placeholder="Search name, city or neighbourhood…" value={query} onChange={e => setQuery(e.target.value)} /><div className="compare-options">{matches.map(p => <button type="button" key={p.id} className="compare-option" onClick={() => { setSelected([...selected, p.id]); setQuery(""); setOpen(false); }}><span><strong>{p.name}</strong><small>{p.property_type} · {p.locality}, {p.city}</small></span><span className="compare-option-add">Add +</span></button>)}{!matches.length && <p className="compare-no-matches">No matching places. Try another name or location.</p>}</div></div>}
      </div>
      <div className="compare-selected-places">{rows.map(p => <article key={p.id} className="compare-selected-place"><div><span className="eyebrow">{p.property_type}</span><h3>{p.name}</h3><p>{p.locality}, {p.city}</p></div><button type="button" className="compare-remove" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)}><ActionIcon name="close"/></button></article>)}{Array.from({length: 3 - rows.length}, (_, i) => <div key={i} className="compare-empty-slot"><span aria-hidden="true">＋</span><span>Place {rows.length + i + 1}</span><small>{properties.length ? "Choose a place above" : "No places available yet"}</small></div>)}</div>
      <div className="compare-picker-footer"><p>{rows.length === 0 ? "Add two places to start comparing." : rows.length === 1 ? "Add one more place for a side-by-side comparison." : "Your comparison updates as you add or remove places."}</p>{rows.length > 0 && <button type="button" className="compare-clear" onClick={() => { setSelected([]); setQuery(""); }}>Clear selection</button>}</div>
    </section>
    {rows.length >= 2 && <section className="compare-table-wrap" tabIndex={0} role="region" aria-label="Property comparison"><table className="compare-table"><caption><span className="section-title">Compare side by side<InfoPopover label="About comparison ratings">Landlord scores belong to each property’s current recorded manager, across their reviewed properties. Older management ratings stay with the manager responsible for that tenancy.</InfoPopover></span></caption><thead><tr><th scope="col">Details</th>{rows.map(p => <th key={p.id} scope="col">{p.name}</th>)}</tr></thead><tbody>{facts.map(f => <tr key={f.label}><th scope="row">{f.label}</th>{rows.map(p => <td key={p.id}>{f.value(p)}</td>)}</tr>)}</tbody></table></section>}
  </div>;
}
