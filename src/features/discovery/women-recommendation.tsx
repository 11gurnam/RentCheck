import { ratingFields } from "@/features/women-program/fields";
import type { WomenSummary } from "@/features/women-program/data";
import { PropertySectionHeading } from "@/features/property-information/section-heading";

const score = (value: number) => `${value.toFixed(1)} / 5`;

export function womenRatingText(summary: WomenSummary) {
  return `${score(summary.rating)} · ${summary.count} ${summary.count === 1 ? "review" : "reviews"}`;
}

export function WomenRecommendation({ summary }: { summary: WomenSummary }) {
  const ratings = ratingFields.flatMap(([key, label]) => {
    if (key === "overall" || key === "recommendation") return [];
    const value = summary.categories[key];
    return value == null ? [] : [{ key, label, value }];
  });
  return (
    <section className="dashboard-card women-recommendation" id="women-experiences">
      <PropertySectionHeading icon="women">Women Tenant Rating</PropertySectionHeading>
      <p className="women-rating-total"><strong>{score(summary.rating)}</strong><span> · {summary.count} {summary.count === 1 ? "review" : "reviews"}</span></p>
      {ratings.length > 0 && <dl className="women-program-categories">
        {ratings.map(({ key, label, value }) => <div key={key}><dt>{label}</dt><dd>{score(value)}</dd></div>)}
      </dl>}
    </section>
  );
}
