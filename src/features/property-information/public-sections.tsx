import type { ReactNode } from "react";
import { displayDate } from "@/lib/display-date";
import type { PropertyInformation } from "./data";
import { rentalLabels, type RentalPreference } from "./preferences";
import { PropertySectionHeading } from "./section-heading";

export function RentalPreferences({ preferences, editor }: {
  preferences: RentalPreference[]; editor?: ReactNode;
}) {
  const labels = rentalLabels(preferences);
  return (
    <section className="dashboard-card property-source rental-preference-summary" aria-label="Landlord-stated rental preferences">
      <PropertySectionHeading icon="rental">Landlord-stated rental preferences</PropertySectionHeading>
      {labels.length ? <>
        <ul className="rental-preference-tags">{labels.map(label => <li key={label}>{label}</li>)}</ul>
        <p className="field-hint">Provided by the landlord – Not independently verified.</p>
      </> : <p className="field-hint">No landlord-stated preferences provided.</p>}
      {editor}
    </section>
  );
}

export function TenantVerificationSummary({ information, demo }: {
  information?: PropertyInformation; demo: boolean;
}) {
  const count = information?.verified_count ?? 0;
  const date = information?.last_verified_at;
  return (
    <section className="dashboard-card property-source tenant-verification-summary" aria-label="RentCheck tenant verification">
      <PropertySectionHeading icon="verification">RentCheck tenant verification</PropertySectionHeading>
      <p>{count ? <strong>{count} {demo ? "demo-approved" : "RentCheck-verified"} tenant {count === 1 ? "review" : "reviews"}</strong> : "No verified tenant reviews yet."}</p>
      {!!count && <p className="field-hint">{information?.current_count ?? 0} current · {information?.former_count ?? 0} previous associations{date && <> · Latest approval <time dateTime={date}>{displayDate(date.slice(0,10))}</time></>}</p>}
      <p className="field-hint">{demo ? "Demonstration verification." : "Verification confirms a tenant’s stay. It does not certify property safety or quality."}</p>
    </section>
  );
}
