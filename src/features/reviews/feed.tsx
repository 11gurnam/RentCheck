import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ActionIcon } from "@/components/ui/action-feedback";
import { displayDate } from "@/lib/display-date";
import { reviewFeed } from "./data";
import { money } from "@/features/discovery/filters";
import { createDatabaseClient } from "@/lib/database/server";
import Image from "next/image";
import { getVerifiedUser } from "@/lib/auth/session";
import { myClaims } from "@/features/claims/data";
import { ReplyForm } from "@/features/claims/forms";
import { ReportForm } from "@/features/moderation/forms";
import { ReviewScoreBadges, ratingTone } from "./score-badges";
export async function ReviewFeed({
  property,
  landlord,
  page = 1,
}: {
  property?: string;
  landlord?: string;
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
      return { review: r.id, photos: data as { id: string }[] };
    }),
  );
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
        {total} experiences · Page {page}
      </p>
      {!!summary?.data?.length && <section className="criterion-summary" aria-label="Average tenant ratings">
        <div className="criterion-summary-heading"><h3>Tenant rating summary</h3><span>{Number(rating).toFixed(1)} / 5 overall</span></div>
        <div className="criterion-summary-grid">{summary.data.map(c => <div key={c.criterion_key}><span>{c.label}</span><strong>{Number(c.rating).toFixed(1)} / 5</strong><div className={`rating-meter rating-${ratingTone(Number(c.rating))}`} role="meter" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Number(c.rating)} aria-label={`${c.label} average rating`}><span style={{ width: `${Number(c.rating) / 5 * 100}%` }} /></div><small>{c.review_count} {c.review_count === 1 ? "review" : "reviews"}</small></div>)}</div>
        <p className="field-hint">Each review’s overall score is the mean of its criteria. The property score is the mean of visible reviews. Older reviews retain their original score.</p>
      </section>}
      {!rows.length &&
        (total ? (
          <p>
            No experiences on this page.{" "}
            <a href={href(1)}>Return to the first experiences page</a>.
          </p>
        ) : (
          <p>Be the first to share a fictional experience.</p>
        ))}
      {rows.map((r) => (
        <article key={r.id} className="dashboard-card tenant-review-card">
          <header className="review-author"><ProfileAvatar name={r.alias} src={avatars[r.id]} /><h3>{r.alias}</h3></header>
          <div className="review-stay-facts"><div><span className="review-date-caption">Tenancy</span><div className="review-date-range"><time dateTime={r.start_date}>{displayDate(r.start_date)}</time><span aria-label="to">→</span>{r.end_date ? <time dateTime={r.end_date}>{displayDate(r.end_date)}</time> : <strong>Current</strong>}</div></div><div className="review-rent"><span className="review-date-caption">Monthly rent paid</span><strong>{money(r.rent_paid)} <small>/ month</small></strong></div></div>
          <p className="demo-tag">
            {verified.find((v) => v.id === r.id)?.verified
              ? "Demonstration verified tenant"
              : "Unverified tenant"}{" "}
            · synthetic example {r.was_edited ? "· Updated" : ""}
          </p>
          <p>
            Management{" "}
            {r.landlord_rating ?? "N/A"}
            {r.landlord_rating ? " / 5" : ""}
          </p>
          <ReviewScoreBadges overall={r.property_rating} criteria={r.criteria} />
<section className="review-description" aria-label="Review description"><h4>Description</h4><p>{r.body}</p></section>
          {!!r.criteria?.length && <details className="review-criterion-details"><summary>Criterion ratings · {Number(r.property_rating).toFixed(1)} / 5 overall</summary><div className="review-criteria-scores">{r.criteria.map(c => <span key={c.key}>{c.label}{c.custom ? " (tenant added)" : ""} <strong>{c.rating} / 5</strong></span>)}</div></details>}
          {replies
            .find((x) => x.review === r.id)
            ?.rows.map((reply) => (
              <aside key={reply.id} className="dashboard-card">
                <header className="review-author"><ProfileAvatar name={reply.alias} src={avatars[reply.id]} /><div><h4>{reply.alias}</h4><small>{reply.representative}</small></div></header>
                <p>{reply.body}</p>
              </aside>
            ))}
          {photos
            .find((x) => x.review === r.id)
            ?.photos.map((ph) => (
              <a key={ph.id} href={"/api/photos/" + ph.id}>
                <Image
                  className="review-photo"
                  src={"/api/photos/" + ph.id}
                  width={400}
                  height={300}
                  unoptimized
                  alt="Synthetic tenant review photo"
                />
              </a>
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
              c.property_id === r.property_id ||
              (c.landlord_id !== null && c.landlord_id === r.landlord_id),
          ) && (
            <ReplyForm
              review={r.id}
              claims={claims.filter(
                (c) =>
                  c.property_id === r.property_id ||
                  (c.landlord_id !== null && c.landlord_id === r.landlord_id),
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
