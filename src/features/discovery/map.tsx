"use client";
import { useState } from "react";
export type MappedProperty = { id: string; name: string; latitude: number; longitude: number; precision: string; is_demo: boolean };
export function RecordedMap({ properties }: { properties: MappedProperty[] }) {
  const [chosen, setChosen] = useState(properties[0]?.id ?? ""), [loadMap, setLoadMap] = useState(false);
  const p = properties.find(p => p.id === chosen);
  if (!p) return <p>No property coordinates have been recorded. Addresses are not automatically geocoded.</p>;
  const lat = Number(p.latitude), lon = Number(p.longitude), delta = p.precision === "approximate" ? 0.03 : 0.006;
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(",");
  const external = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
  return <><label>Recorded property location<select value={chosen} onChange={e => { setChosen(e.target.value); setLoadMap(false); }}>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><section className="dashboard-card"><h2><a href={`/properties/${p.id}`}>{p.name}</a></h2><p>{p.precision === "approximate" ? "Approximate location" : "Exact recorded coordinates"}: {lat}, {lon}. {p.is_demo && "Fictional demonstration coordinates."}</p><p>Maps are provided by OpenStreetMap. Loading the map sends your IP address and these coordinates to that provider.</p><button type="button" onClick={() => setLoadMap(true)}>Load OpenStreetMap</button> · <a href={external} target="_blank" rel="noreferrer">Open location in OpenStreetMap</a>{loadMap && <iframe title={`Map for ${p.name}`} className="property-map" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`} />}</section></>;
}
