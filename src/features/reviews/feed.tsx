import { reviewFeed } from "./data";
import { money } from "@/features/discovery/filters";
import { createDatabaseClient } from "@/lib/database/server";
import Image from "next/image";
export async function ReviewFeed({
  property,
  landlord,
}: {
  property?: string;
  landlord?: string;
}) {
  const rows = await reviewFeed(property, landlord);
  const db = await createDatabaseClient();
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
      return { review: r.id, photos: data as { id: string }[] };
    }),
  );
  return (
    <section className="history-panel">
      <h2>{landlord ? "Management experiences" : "Tenant experiences"}</h2>
      <p>
        {rating != null
          ? rating + " / 5 · " + count + " ratings"
          : landlord
            ? "No management ratings yet."
            : "No tenant ratings yet."}
      </p>
      {!rows.length && <p>Be the first to share a fictional experience.</p>}
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
    </section>
  );
}
