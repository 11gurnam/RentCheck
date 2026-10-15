import { InfoPopover } from "@/components/ui/info-popover";
export function recommendationText(positive:number, eligible:number, recommended:boolean) {
  if (!eligible) return "No recommendations yet.";
  return `${positive} of ${eligible} women tenants recommend this place.${recommended ? " Recommended by tenants." : ""}`;
}
export function WomenRecommendation({positive,eligible,recommended,demo=false}:{positive:number;eligible:number;recommended:boolean;demo?:boolean}) {
  return <div className="women-recommendation"><div className="section-title"><span className="women-icon-badge"><svg className="women-avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15V9a6 6 0 0 1 12 0v6M8 8c2 0 3-1 4-3 1 2 2 3 4 3v2a4 4 0 0 1-8 0V8ZM9 15c-3 1-4 3-4 6m10-6c3 1 4 3 4 6M9 15l3 3 3-3"/></svg></span><h2>Women’s recommendations</h2><InfoPopover label="About women’s recommendations">Feedback from women tenants with approved residence evidence. {demo ? "This demonstration uses simulated verification. " : ""}A recommendation badge appears only when enough eligible responses meet the platform’s criteria. Recommendations reflect tenant opinions, not a safety guarantee.</InfoPopover></div><p>{recommendationText(positive,eligible,recommended)}</p></div>;
}
