import type { CriterionRating } from "./criteria";
export function ratingTone(rating: number) { return rating < 3 ? "low" : rating < 4 ? "mid" : "high"; }
export function ReviewScoreBadges({ overall, criteria = [], showOverall = true }: { overall: number; criteria?: CriterionRating[]; showOverall?: boolean }) {
  return <div className="tenant-score-badges" aria-label="Tenant review ratings">{showOverall && <span className={`tenant-overall rating-${ratingTone(overall)}`}>★ Overall <strong>{Number(overall).toFixed(1)} / 5</strong></span>}{["water", "electricity", "cleanliness"].map(key => {const c=criteria.find(c=>c.key===key);return c ? <span key={key} className={`tenant-criterion rating-${ratingTone(c.rating)}`}>{key === "water" ? "Water" : key === "electricity" ? "Electricity" : "Cleanliness"} <strong>{c.rating}/5</strong></span> : null;})}</div>;
}
