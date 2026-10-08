import { reviewFeed } from "./data";
import { money } from "@/features/discovery/filters";
import { createDatabaseClient } from "@/lib/database/server";
import Image from "next/image";
import { getVerifiedUser } from "@/lib/auth/session";
import { myClaims } from "@/features/claims/data";
import { ReplyForm } from "@/features/claims/forms";
import { ReportForm } from "@/features/moderation/forms";
import { PhotoCaption, type PhotoSource } from "@/features/photos/caption";
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
  const score = await db
    .from(landlord ? "landlord_scores" : "property_scores")
    .select("*")
    .eq(landlord ? "landlord_id" : "property_id", landlord ?? property)
    .maybeSingle();
  if (score.error) throw new Error("Ratings unavailable");
  const rating = score.data?.[landlord ? "landlord_rating" : "property_rating"];
  const count = score.data?.review_count ?? 0;
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
  return (
    <section className="history-panel" id="experiences">
      <h2>{landlord ? "Management experiences" : "Tenant experiences"}</h2>
      <p>
        {rating != null
          ? rating + " / 5 · " + count + " ratings"
          : landlord
            ? "No management ratings yet."
            : "No tenant ratings yet."}
      </p>
      <p>
        {total} experiences · Page {page}
      </p>
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
        <article key={r.id} className="dashboard-card">
          <h3>{r.alias}</h3>
          <p className="demo-tag">
            {verified.find((v) => v.id === r.id)?.verified
              ? "Demonstration verified tenant"
              : "Unverified tenant"}{" "}
            · synthetic example {r.was_edited ? "· Updated" : ""}
          </p>
          <p>
            Property {r.property_rating} / 5 · Management{" "}
            {r.landlord_rating ?? "Unanswered"}
            {r.landlord_rating ? " / 5" : ""}
          </p>
          <p>{r.body}</p>
          {user ? (
            <ReportForm review={r.id} />
          ) : (
            <p>
              <a href="/sign-in">Sign in to report this review</a>
            </p>
          )}
          {replies
            .find((x) => x.review === r.id)
            ?.rows.map((reply) => (
              <aside key={reply.id} className="dashboard-card">
                <h4>
                  {reply.representative} · {reply.alias}
                </h4>
                <p>{reply.body}</p>
              </aside>
            ))}
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
          {photos
            .find((x) => x.review === r.id)
            ?.photos.map((ph) => (
              <figure key={ph.id} className="photo-card">
                <a href={"/api/photos/" + ph.id}>
                  <Image
                    className="review-photo"
                    src={"/api/photos/" + ph.id}
                    width={400}
                    height={300}
                    unoptimized
                    alt="Photo shared by a tenant"
                  />
                </a>
                <PhotoCaption photo={ph} />
              </figure>
            ))}
          <p>
            {r.start_date} → {r.end_date ?? "Current"} · {money(r.rent_paid)} /
            month
          </p>
          {r.landlord_id && (
            <a href={"/landlords/" + r.landlord_id}>Manager for this tenancy</a>
          )}
          <p>
            <a href={"/properties/" + r.property_id}>Property profile</a>
          </p>
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
