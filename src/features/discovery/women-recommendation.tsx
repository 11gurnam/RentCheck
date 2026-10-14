export function recommendationText(positive:number, eligible:number, recommended:boolean) {
  if (!eligible) return "No recommendations from women tenants yet.";
  return `${positive} of ${eligible} women tenants recommend this place.${recommended ? "" : " More responses are needed for a recommendation badge."}`;
}
export function WomenRecommendation({positive,eligible,recommended,demo=false}:{positive:number;eligible:number;recommended:boolean;demo?:boolean}) {
  return <div className="women-recommendation"><div className="section-title"><svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M12 11v10M8 17h8"/></svg><h2>Women’s Tenant Recommendations</h2></div><p>See feedback from women tenants to help you make a more informed rental decision.</p><p>{recommendationText(positive,eligible,recommended)}</p><small>{demo ? "Demo recommendations use simulated verification." : "Counts use women tenants with approved residence evidence."} Recommendations reflect tenant opinions and are not a safety guarantee.</small></div>;
}
