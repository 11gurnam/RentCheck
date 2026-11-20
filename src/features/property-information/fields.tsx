"use client";

import { useState } from "react";
import { rentalOptions, type RentalPreference } from "./preferences";

export function RentalPreferenceFields({ initial = [], search = false }: {
  initial?: RentalPreference[]; search?: boolean;
}) {
  const [selected, setSelected] = useState(initial);
  function toggle(value: RentalPreference, checked: boolean) {
    setSelected(previous => {
      if (!checked) return previous.filter(option => option !== value);
      if (value === "anyone") return ["anyone"];
      return [...previous.filter(option => option !== "anyone"), value];
    });
  }
  return (
    <fieldset className="rental-choice-panel wide">
      <legend>{search ? "Landlord-stated rental preferences" : "Who are you willing to rent this property to?"}</legend>
      <p className="field-hint">{search
        ? "Match all selected groups. A landlord who states Anyone matches every group."
        : "Optional. These are landlord-stated preferences. Choosing Anyone clears the other choices."}</p>
      <div className="rental-choice-grid">
        {rentalOptions.map(([value, label]) => <label key={value}>
          <input type="checkbox" name="eligibility" value={value} checked={selected.includes(value)}
            onChange={event => toggle(value,event.target.checked)}/>
          {label}
        </label>)}
      </div>
    </fieldset>
  );
}
