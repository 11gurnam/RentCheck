"use client";
import { useActionState, useState } from "react";
import { contribute, saveProperty } from "./actions";
import type { ContributionState } from "./validation";
export function SaveForm({
  property,
  saved,
}: {
  property: string;
  saved: boolean;
}) {
  const [state, action, pending] = useActionState(saveProperty, {message:""});
  return (
    <form action={action} className="save-form">
      <input type="hidden" name="property" value={property} />
      <input type="hidden" name="saved" value={String(!saved)} />
      <button className="button" disabled={pending}>
        {pending
          ? "Saving…"
          : saved
            ? "Remove from shortlist"
            : "Save to shortlist"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
export function ContributionForm() {
  const [state, action, pending] = useActionState(contribute, {
    status: "idle",
  } as ContributionState);
  const [values, setValues] = useState<Record<string, string>>({
    type: "Flat",
  });
  const fields = [
    ["name", "Property name"],
    ["address", "Full demo address"],
    ["state", "State / union territory"],
    ["city", "City"],
    ["locality", "Locality"],
    ["min", "Minimum monthly rent (₹)"],
    ["max", "Maximum monthly rent (₹)"],
  ];
  const [checks, setChecks] = useState({synthetic:false,owner:false});
  return (
    <form action={action} className="contribution-form" onReset={event=>event.preventDefault()}>
      {fields.map(([name, label]) => (
        <div className="form-field" key={name}>
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            name={name}
            type={["min", "max"].includes(name) ? "number" : "text"}
            required
            min={["min", "max"].includes(name) ? 0 : undefined}
            maxLength={name === "address" ? 300 : 120}
            value={values[name] ?? ""}
            onChange={(e) => setValues({ ...values, [name]: e.target.value })}
          />
        </div>
      ))}
      <div className="form-field">
        <label htmlFor="type">Accommodation type</label>
        <select
          id="type"
          name="type"
          value={values.type}
          onChange={(e) => setValues({ ...values, type: e.target.value })}
        >
          {["Flat", "House", "PG", "Hostel", "Homestay"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <div className="form-field wide">
        <label htmlFor="description">About this place</label>
        <textarea
          id="description"
          name="description"
          maxLength={3000}
          value={values.description ?? ""}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
        />
      </div>
      <label className="checkbox-row wide">
        <input type="checkbox" name="declaredOwner" checked={checks.owner} onChange={e=>setChecks({...checks,owner:e.target.checked})}/>I own this fictional
        example (this prevents reviewing my own place; it grants no management
        permissions).
      </label>
      <label className="checkbox-row wide">
        <input type="checkbox" name="synthetic" required checked={checks.synthetic} onChange={e=>setChecks({...checks,synthetic:e.target.checked})}/>
        All details are fictional demonstration data.
      </label>
      {state.message && (
        <p role="alert" className="form-feedback error wide">
          {state.message}
        </p>
      )}
      {state.candidates && (
        <div className="wide duplicate-panel">
          <h2>Possible existing places</h2>
          <ul>
            {state.candidates.map((c) => (
              <li key={c.id}>
                <a href={`/properties/${c.id}`}>{c.name}</a>
                <p>
                  {c.address} · {c.city}
                </p>
                {c.exact && <strong>Same address</strong>}
              </li>
            ))}
          </ul>
          {!state.candidates.some((c) => c.exact) && (
            <label className="checkbox-row">
              <input type="checkbox" name="acknowledged" />I checked these
              profiles; this is a distinct fictional place.
            </label>
          )}
        </div>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Adding…" : "Add demo property"}
      </button>
    </form>
  );
}
