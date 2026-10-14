import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ActionIcon } from "@/components/ui/action-feedback";
import { displayDate } from "@/lib/display-date";
import { reviewFeed } from "./data";
import { money } from "@/features/discovery/filters";
import { createDatabaseClient } from "@/lib/database/server";
import { PhotoMedia } from "@/features/photos/media";
import { ReviewDescription } from "./description";
import { getVerifiedUser } from "@/lib/auth/session";
import { myClaims } from "@/features/claims/data";
import { ReplyForm } from "@/features/claims/forms";
import { ReportForm } from "@/features/moderation/forms";
import { type PhotoSource } from "@/features/photos/caption";
import { ReviewScoreBadges, ratingTone } from "./score-badges";
import { criteriaFor } from "./criteria";
export async function ReviewFeed({
  property,
  landlord,
  propertyType = "",
  page = 1,
}: {
  property?: string;
  landlord?: string;
  propertyType?: string;
  page?: number;
}) {
  const { rows, total } = await reviewFeed(property, landlord, page);
  const href = (n: number) =>
    (landlord ? "/landlords/" + landlord : "/properties/" + property) +
    "?reviews=" +
    n +
    "#experiences";
  const db = await createDatabaseClient();
  const user = await getVerifiedUser();
  const claims = user
    ? (await myClaims()).filter((c) => c.status === "approved")
    : [];
  const replies = await Promise.all(
    rows.map(async (r) => {
      const { data, error } = await db.rpc("get_claimant_replies", {
        p_review: r.id,
      });
      if (error) throw new Error("Replies unavailable");
      return {
        review: r.id,
        rows: data as {
          id: string;
          body: string;
          alias: string;
          representative: string;
        }[],
      };
    }),
  );
  const profiles = rows.length ? await db.rpc("get_review_avatars", { p_reviews: rows.map(r => r.id) }) : null;
  if (profiles?.error) throw new Error("Public profiles unavailable");
  const avatars = (profiles?.data ?? {}) as Record<string, string | null>;
  const score = await db
    .from(landlord ? "landlord_scores" : "property_scores")
    .select("*")
    .eq(landlord ? "landlord_id" : "property_id", landlord ?? property)
    .maybeSingle();
  if (score.error) throw new Error("Ratings unavailable");
  const rating = score.data?.[landlord ? "landlord_rating" : "property_rating"];
  const count = score.data?.review_count ?? 0;
  const summary = property ? await db.from("property_criterion_scores").select("*").eq("property_id", property).order("criterion_key") : null;
  if (summary?.error) throw new Error("Criterion scores unavailable");
  const averages = summary?.data ?? [];
  const categories = criteriaFor(propertyType);
  const categorySummary = [...categories.map(c => {
    const average = averages.find(a => a.criterion_key === c.key);
    return { criterion_key: c.key, label: c.label, rating: average?.rating ?? null, review_count: average?.review_count ?? 0 };
  }), ...averages.filter(a => !categories.some(c => c.key === a.criterion_key))];
  const verified = await Promise.all(
    rows.map(async (r) => {
      const { data, error } = await db.rpc("review_is_verified", {
        p_review: r.id,
      });
      if (error) throw new Error("Verification unavailable");
      return { id: r.id, verified: data === true };
    }),
  );
  const photos = await Promise.all(
    rows.map(async (r) => {
      const { data, error } = await db.rpc("get_review_photos", {
        p_review: r.id,
      });
      if (error) throw new Error("Photos unavailable");
      return { review: r.id, photos: data as PhotoSource[] };
    }),
  );
  const allGallery = property ? await db.rpc("get_property_gallery", { p_property: property }) : null;
  if (allGallery?.error) throw new Error("Tenant photos unavailable");
  const tenantPhotos = property ? ((allGallery?.data ?? []) as PhotoSource[]).filter(p => p.role === "tenant").map(p => { const review = photos.find(r => r.photos.some(photo => photo.id === p.id)); return { ...p, review_href: review ? `#review-${review.review}` : undefined }; }) : photos.flatMap(r => r.photos.map(p => ({ ...p, avatar_url: avatars[r.review], review_href: `#review-${r.review}` })));
  return (
    <section className="history-panel" id="experiences">
      <h2>{landlord ? "Management experiences" : "Tenant experiences"}</h2>
      <p>
        {rating != null
          ? Number(rating).toFixed(1) + " / 5 · " + count + " ratings"
          : landlord
            ? "No management ratings yet."
            : "No tenant ratings yet."}
      </p>
      <p>
        {total} {total === 1 ? "review" : "reviews"} · Page {page}
      </p>
      {property && count > 0 && <section className="rating-summary-compact" aria-label="Average tenant ratings">
        <div className="rating-summary-score"><strong>★ {rating == null ? "N/A" : Number(rating).toFixed(1)} <small>/ 5</small></strong><span>{count} {count === 1 ? "tenant rating" : "tenant ratings"}</span></div>
        <details className="rating-category-breakdown"><summary>Ratings by category <span>View breakdown</span></summary>
          <div className="rating-category-rows">{categorySummary.filter(c => c.rating != null).map(c => <div className="rating-category-row" key={c.criterion_key}><span>{c.label}</span><div className={`rating-meter rating-${ratingTone(Number(c.rating))}`} role="meter" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Number(c.rating)} aria-label={`${c.label} average rating`}><span style={{ width: `${Number(c.rating) / 5 * 100}%` }} /></div><strong>{Number(c.rating).toFixed(1)} <small>/ 5</small></strong><small>{c.review_count} {c.review_count === 1 ? "rating" : "ratings"}</small></div>)}</div>
          {categorySummary.some(c => c.rating == null) && <p className="rating-category-unrated"><strong>Not rated yet:</strong> {categorySummary.filter(c => c.rating == null).map(c => c.label).join(" · ")}</p>}
          <p className="field-hint">Category scores average published tenant ratings. Overall averages the reviews’ scores; older reviews may only have an overall score.</p>
        </details>
      </section>}
      {!rows.length &&
        (total ? (
          <p>
            No experiences on this page.{" "}
            <a href={href(1)}>Return to the first experiences page</a>.
          </p>
        ) : (
          <p>No reviews yet. Be the first to share your experience.</p>
        ))}
      <PhotoMedia carousel photos={tenantPhotos} title="Photos shared by tenants" />
      {rows.map((r) => (
        <article id={`review-${r.id}`} key={r.id} className="dashboard-card tenant-review-card">
          <header className="review-author review-author-structured"><ProfileAvatar name={r.alias} src={avatars[r.id]} /><div><h3>{r.alias}</h3>{r.created_at && <time dateTime={r.created_at}>Reviewed {displayDate(r.created_at.slice(0,10))}</time>}</div><span className="review-header-rating">★ {Number(r.property_rating).toFixed(1)} / 5</span></header>
          <div className="review-stay-facts"><div><span className="review-date-caption">Tenancy</span><div className="review-date-range"><time dateTime={r.start_date}>{displayDate(r.start_date)}</time><span aria-label="to">→</span>{r.end_date ? <time dateTime={r.end_date}>{displayDate(r.end_date)}</time> : <strong>Current</strong>}</div></div><div className="review-rent"><span className="review-date-caption">Monthly rent paid</span><strong>{money(r.rent_paid)} <small>/ month</small></strong></div></div>
          <div className="review-meta-row"><p className={verified.find((v) => v.id === r.id)?.verified && !r.is_demo ? "semantic-status status-success" : "demo-tag"}>
            {verified.find((v) => v.id === r.id)?.verified
              ? (r.is_demo ? "Demonstration verified tenant" : "Verified Tenant · this property and tenancy")
              : "Unverified Tenant"}{" "}
            {r.is_demo ? "· synthetic example" : "· User experience"} {r.was_edited ? "· Updated" : ""}
          </p>
          <p className="review-management-score">
            Management{" "}
            {r.landlord_rating ?? "N/A"}
            {r.landlord_rating ? " / 5" : ""}
          </p>
          <ReviewScoreBadges overall={r.property_rating} criteria={r.criteria} showOverall={false} /></div>
<ReviewDescription body={r.body} />
          <PhotoMedia compact photos={(photos.find(p => p.review === r.id)?.photos ?? []).map(p => ({ ...p, avatar_url: avatars[r.id] }))} title={`Photos attached to ${r.alias}’s review`} />
          <details className="review-criterion-details"><summary>View detailed ratings</summary><div className="review-criteria-scores">{(r.criteria?.length ? r.criteria : categories.map(c => ({ ...c, rating: null, custom: false }))).map(c => <span key={c.key}>{c.label}{c.custom ? " (tenant added)" : ""} <strong>{c.rating == null ? "N/A" : `${Number(c.rating).toFixed(1)} / 5`}</strong></span>)}<span>Management <strong>{r.landlord_rating == null ? "N/A" : `${Number(r.landlord_rating).toFixed(1)} / 5`}</strong></span></div>{!r.criteria?.length && <p className="field-hint">This older review includes an overall score, but no individual category ratings.</p>}</details>
          {replies
            .find((x) => x.review === r.id)
            ?.rows.map((reply) => (
              <aside key={reply.id} className="dashboard-card">
                <header className="review-author"><ProfileAvatar name={reply.alias} src={avatars[reply.id]} /><div><h4>{reply.alias}</h4><small className="verified-response-label"><ActionIcon name="shield" />{reply.representative}</small></div></header>
                <p>{reply.body}</p>
              </aside>
            ))}
          <footer className="review-actions review-feed-actions">
            <a className="review-action" href={"/properties/" + r.property_id}><svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/></svg>Property profile</a>
            {r.landlord_id && <a className="review-action" href={"/landlords/" + r.landlord_id}><ActionIcon name="shield"/>Manager for this tenancy</a>}
          {user ? (
            <ReportForm review={r.id} />
          ) : (
            <p>
              <a href="/sign-in">Sign in to report this review</a>
            </p>
          )}
          {claims.some(
            (c) =>
              c.property_id === r.property_id,
          ) && (
            <ReplyForm
              review={r.id}
              claims={claims.filter(
                (c) =>
                  c.property_id === r.property_id,
              )}
            />
          )}
          </footer>
        </article>
      ))}
      <nav className="pagination" aria-label="Experience pages">
        {page > 1 && <a href={href(page - 1)}>Previous experiences page</a>}
        {page * 20 < total && (
          <a href={href(page + 1)}>Next experiences page</a>
        )}
      </nav>
    </section>
  );
}
