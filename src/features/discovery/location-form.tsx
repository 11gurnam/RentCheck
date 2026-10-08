"use client";
import { useActionState } from "react";
import { saveLocation } from "./location-actions";
export function LocationForm({ properties }: { properties: { id: string; name: string }[] }) {
  const [s, a, p] = useActionState(saveLocation, {});
  return <form action={a} className="auth-form"><label>Property<select name="property">{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Latitude<input name="latitude" type="number" step="any" min={6} max={38} /></label><label>Longitude<input name="longitude" type="number" step="any" min={68} max={98} /></label><label>Location precision<select name="precision"><option value="approximate">Approximate area</option><option value="exact">Exact recorded coordinates</option></select></label><label><input name="remove" type="checkbox" /> Remove this property's coordinates</label><label>Coordinate source and audit reason<textarea name="reason" required minLength={10} maxLength={2000} /></label><button disabled={p}>Save recorded location</button>{s.message && <p role="status">{s.message}</p>}</form>;
}
