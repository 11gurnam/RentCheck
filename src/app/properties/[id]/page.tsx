import { notFound } from "next/navigation";
import { z } from "zod";
import { AccountShell } from "@/components/ui/account-shell";
import {
  getProperty,
  getAssociations,
  getLandlord,
} from "@/features/discovery/data";
import { money } from "@/features/discovery/filters";
import { getVerifiedUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { SaveForm } from "@/features/contributions/forms";
import { womensCounts } from "@/features/verification/data";
import { ReviewFeed } from "@/features/reviews/feed";
import { reviewPage } from "@/features/reviews/pagination";
import { ownReviews } from "@/features/reviews/data";
import { CameraIcon } from "@/components/ui/camera-icon";
import { ActionIcon } from "@/components/ui/action-feedback";
export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviews?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const p = await getProperty(id);
  if (!p) notFound();
  const user = await getVerifiedUser();
  const ownReview = user ? (await ownReviews()).find((r) => r.property_id === id && r.status === "visible") : null;
  const allowed = user
    ? await (
        await createDatabaseClient()
      ).rpc("can_review_property", { p_property: id })
    : null;
  if (allowed?.error) throw new Error("Review access unavailable");
  const saved = user
    ? await (await createDatabaseClient()).rpc("get_saved_properties")
    : null;
  const isSaved = !!saved?.data?.some(
    (row: { property_id: string }) => row.property_id === id,
  );
  const women = await womensCounts(id);
  const associations = await getAssociations(id);
  const history = await Promise.all(
    associations.map(async (a) => ({
      ...a,
      landlord: await getLandlord(a.landlord_id),
    })),
  );
  return (
    <AccountShell>
      <a href="/search" className="text-link">
        ← Explore accommodation
      </a>
      <div className="profile-hero property-profile-hero">
        <p className="eyebrow">
          {p.property_type} · {p.city}, {p.state}
        </p>
        <h1>{p.name}</h1>
        <p>{p.address}</p>
        <p className="rent">
          {money(p.rent_min)}–{money(p.rent_max)} / month
        </p>
        {p.is_demo && (
          <span className="demo-tag">
            Synthetic example · not a rental offer
          </span>
        )}
      </div>
      <div className="property-actions" aria-label="Property actions">
        <SaveForm property={id} saved={isSaved} />
        <a className="property-secondary-action" href={`/claims/new?kind=property&target=${id}`}>
          <ActionIcon name="shield" />Claim this profile
        </a>
        {allowed?.data === false ? (
          <span>You cannot review your own property.</span>
        ) : (
          <a className="primary-link" href={`/reviews/new?property=${id}`}>
            <ActionIcon name="edit" />Write a review
          </a>
        )}
      </div>
      <div className="dashboard-grid property-detail-panels">
        <section className="dashboard-card">
          <h2>About this place</h2>
          <p>{p.description}</p>
          <h3>Current manager</h3>
          {p.landlord_id ? (
            <a href={`/landlords/${p.landlord_id}`}>{p.landlord_name}</a>
          ) : (
            <p>Manager not recorded</p>
          )}
        </section>
        <section className="dashboard-card">
          <h2>Women’s tenant recommendations</h2>

          <p className="field-hint">
            Property and management ratings remain separate.
          </p>
          <p>
            {women?.recommended
              ? "Recommended by eligible women tenants."
              : "Recommendation threshold not reached."}{" "}
            {women?.positive_count ?? 0}/{women?.eligible_count ?? 0} eligible
            positive responses. Demonstration verification only. Tenant
            recommendations are never a safety guarantee.
          </p>
        </section>
      </div>
      <section className="dashboard-card property-photo-panel" id="photos">
        <div><h2>Photos</h2><p className="field-hint">Share a glimpse of your stay.</p></div>
        {allowed?.data === false ? <p>You cannot add tenant photos to your own property.</p> : <a className="button camera-action" href={ownReview ? `/reviews/${ownReview.id}/edit#review-photos` : `/reviews/new?property=${id}`}><CameraIcon /><span>Add photos{!ownReview && <small>Start with a review</small>}</span></a>}
      </section>
      <ReviewFeed
        property={id}
        page={reviewPage((await searchParams).reviews)}
      />
      <section className="history-panel">
        <h2>Management history</h2>
        <p>
          Dates preserve who managed the place during a tenancy. End dates are
          exclusive.
        </p>
        {history.length ? (
          <ul>
            {history.map((a) => (
              <li key={a.id}>
                <a href={`/landlords/${a.landlord_id}`}>{a.landlord?.name}</a>
                <span>
                  {a.start_date} → {a.end_date ?? "Ongoing"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No management association recorded.</p>
        )}
      </section>
    </AccountShell>
  );
}
