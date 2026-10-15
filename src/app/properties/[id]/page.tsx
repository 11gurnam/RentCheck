import { WomenRecommendation } from "@/features/discovery/women-recommendation";
import { InfoPopover } from "@/components/ui/info-popover";
import { PropertyClaimStatus } from "@/features/claims/property-status";
import { displayDate } from "@/lib/display-date";
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
import { PropertyGallery } from "@/features/photos/gallery";
import { StartConversation } from "@/features/messaging/forms";
import { ownReviews } from "@/features/reviews/data";
import { CameraIcon } from "@/components/ui/camera-icon";
import { ActionIcon } from "@/components/ui/action-feedback";
import { PropertyLocation } from "@/features/discovery/property-location";
import { AppealForm } from "@/features/admin-platform/forms";
import { myProfileClaim } from "@/features/claims/data";
import { PropertyPhoneContact } from "@/features/messaging/property-phone";
import { PropertyClaimActions } from "@/features/claims/property-actions";
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
  const claim=user?await myProfileClaim(id):null;
  const representsProperty=allowed?.data===false||!!(claim&&["pending","approved","disputed"].includes(claim.status));
  const saved = user
    ? await (await createDatabaseClient()).rpc("get_saved_properties")
    : null;
  const isSaved = !!saved?.data?.some(
    (row: { property_id: string }) => row.property_id === id,
  );
  const women = await womensCounts(id);
  const contacts = user && !representsProperty ? await (await createDatabaseClient()).rpc("get_contactable_representatives", { p_property: id }) : null;
  const associations = await getAssociations(id);
  const history = await Promise.all(
    associations.map(async (a) => ({
      ...a,
      landlord: await getLandlord(a.landlord_id),
    })),
  );
  return (
    <AccountShell>
      <div className="property-detail-page">
      <a href="/search" className="text-link">
        ← Explore accommodation
      </a>
      <div className="profile-hero property-profile-hero">
        <div className="property-heading-copy">
        <p className="eyebrow">
          {p.property_type} · {p.city}, {p.state}
        </p>
        <h1>{p.name}</h1>
        <p>{p.address}{p.postal_code ? ` · PIN ${p.postal_code}` : ""}</p>
        <a className="property-review-link" href="#experiences">{p.property_rating == null ? "No tenant ratings yet" : `★ ${Number(p.property_rating).toFixed(1)} · ${p.review_count} ${p.review_count === 1 ? "review" : "reviews"}`}</a>
        {p.is_demo && (
          <span className="demo-tag">
            Synthetic example · not a rental offer
          </span>
        )}
        </div>
        <div className="property-price-summary"><span>Monthly rent range</span><p className="rent">{money(p.rent_min)}–{money(p.rent_max)}</p><small>per month</small></div>
      </div>
      <nav className="property-section-nav" aria-label="On this property page"><a href="#property-photos">Photos</a><a href="#property-overview">Overview</a>{p.latitude != null && p.longitude != null && <a href="#place-location">Location</a>}<a href="#experiences">Tenant reviews</a><a href="#representative-contact">Contact</a></nav>
      <PropertyGallery property={id} representing={representsProperty} claimHref={claim?`/claims#claim-${claim.id}`:undefined} />
      <div className="property-actions" aria-label="Property actions">
        {!representsProperty && <SaveForm property={id} saved={isSaved} />}
        <PropertyClaimActions property={id} claim={claim} owner={representsProperty}/>
        {!representsProperty && (
          <a className="primary-link" href={`/reviews/new?property=${id}`}>
            <ActionIcon name="edit" />Write a review
          </a>
        )}
        {!representsProperty && <a className="property-secondary-action" href="#representative-contact"><ActionIcon name="shield" />Contact representative</a>}
        {!representsProperty && <a className="property-secondary-action camera-action" href={ownReview ? `/reviews/${ownReview.id}/edit#review-photos` : `/reviews/new?property=${id}`}><CameraIcon />Add review photos</a>}
        {user && !representsProperty && <AppealForm kind="property" target={id} label="Report this property" />}
      </div>
      <div className="property-content-layout">
        <section className="dashboard-card property-about-card" id="property-overview">
          <h2>About this place</h2>
          <p>{p.description}</p>
          <h3>Current manager</h3>
          {p.landlord_id ? (
            <a href={`/landlords/${p.landlord_id}`}>{p.landlord_name}</a>
          ) : (
            <p>Manager not recorded</p>
          )}
          <p className="manager-score">Landlord / management rating: <strong>{p.landlord_rating==null?"No ratings yet":`${Number(p.landlord_rating).toFixed(1)} / 5 · ${p.landlord_review_count??0} rated reviews`}</strong></p>{!representsProperty && <div className="landlord-rating-actions"><div className="landlord-rating-button"><a className="review-action" href={`/reviews/new?property=${id}#manager-rating`}>★ Leave Landlord Rating</a><InfoPopover label="About landlord ratings">Share your experience with a landlord. Your feedback helps other tenants make informed rental decisions.</InfoPopover></div></div>}
        </section>
        <aside className="property-sidebar" aria-label="Tenant recommendations and contact">
        <section className="dashboard-card recommendation-panel">
          <WomenRecommendation positive={women?.positive_count??0} eligible={women?.eligible_count??0} recommended={women?.recommended??false} demo={p.is_demo}/>
        </section>
      <section className="dashboard-card" id="representative-contact"><div className="section-title"><h2>Landlord &amp; contact</h2><InfoPopover label="About landlord verification and contact">Ownership or authority evidence is manually reviewed for this property. Tenant opinions are not independently fact-checked. Only approved representatives who accept messages can be contacted.</InfoPopover></div><PropertyClaimStatus property={id} /><PropertyPhoneContact property={id}/>{representsProperty ? <p className="field-hint">{claim?.status==="approved"?"Choose your public phone visibility and tenant messaging preferences in Contact settings.":"Property contact controls become available after claim approval."}</p> : contacts?.error ? <p role="status">Representative contact is temporarily unavailable.</p> : contacts?.data?.length ? contacts.data.map((c: { profile_id: string; alias: string }) => <StartConversation key={c.profile_id} property={id} profile={c.profile_id} alias={c.alias} />) : <p className="field-hint">Contact is currently unavailable.</p>}<a className="review-action" href={representsProperty?"/account/contact":"/messages"}>{representsProperty?"Contact settings":"Your messages"}</a></section>
        </aside>
      {p.latitude != null && p.longitude != null && <div className="property-location-panel"><PropertyLocation name={p.name} latitude={p.latitude} longitude={p.longitude} precision={p.precision}/></div>}
      <ReviewFeed
        property={id}
        canReview={!representsProperty}
        propertyType={p.property_type}
        page={reviewPage((await searchParams).reviews)}
      />
      <section className="history-panel">
        <div className="section-title"><h2>Management history</h2><InfoPopover label="About management history">Dates show who managed the property during each tenancy. End dates are exclusive; a past tenant’s management rating stays with the manager responsible for that stay.</InfoPopover></div>
        {history.length ? (
          <ul>
            {history.map((a) => (
              <li key={a.id}>
                <a href={`/landlords/${a.landlord_id}`}>{a.landlord?.name}</a>
                <span>
                  {displayDate(a.start_date)} → {a.end_date ? displayDate(a.end_date) : "Ongoing"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No management association recorded.</p>
        )}
      </section>
      </div>
      </div>
    </AccountShell>
  );
}
