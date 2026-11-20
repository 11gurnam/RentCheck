import Image from "next/image";
import { createDatabaseClient } from "@/lib/database/server";
import type { PhotoSource } from "@/features/photos/caption";
import { rentalLabels } from "@/features/property-information/preferences";
import { CardPhotoUpload } from "@/features/reviews/card-photo-upload";
import { SaveForm } from "@/features/contributions/forms";
import { ActionIcon } from "@/components/ui/action-feedback";
import type { Property } from "./data";
import { money } from "./filters";
import { googleMapsAddressUrl } from "./map-url";
import { resolveMapPoint } from "@/features/addresses/city-map-point";
import { WomenRatingIcon } from "./women-rating-icon";

export async function PropertyCard({ property: p, shortlisted = false }: { property: Property; shortlisted?: boolean }) {
  const { data } = await (await createDatabaseClient()).rpc("get_property_gallery", { p_property: p.id });
  const photos = (data ?? []) as PhotoSource[];
  const cover = photos.find(photo => photo.role === "landlord") ?? photos[0];
  const preferences = rentalLabels(p.information?.preferences ?? []);
  const verified = !!p.information?.verified_count;
  const women = p.information?.women?.rating;
  const mapPoint = resolveMapPoint(p);
  const mapLabel = mapPoint && mapPoint.precision !== "city" ? "Search address on map" : "View map";
  const mapHref = mapPoint
    ? `/properties/${p.id}#place-location`
    : googleMapsAddressUrl([p.address, p.locality, p.city, p.state, "India"].filter(Boolean).join(", "));
  const mapLink = (
    <a className={shortlisted ? "review-action" : "search-property-map-link"} href={mapHref} aria-label={`${mapLabel} for ${p.name}`}>
      <svg className="action-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>
      </svg>
      {mapLabel}
    </a>
  );
  return (
    <article className="property-card search-property-card">
      {cover ? (
        <Image className="search-property-cover" src={`/api/photos/${cover.id}`}
          width={560} height={300} alt={`${p.name} · photo shared by a ${cover.role}`} unoptimized/>
      ) : <PropertyArt/>}
      {!shortlisted && <details className="search-property-tools">
        <summary aria-label={`Tools for ${p.name}`}><span aria-hidden="true">⋯</span></summary>
        <div className="search-property-tools-menu">
          <CardPhotoUpload property={p.id} name={p.name}/>
          <nav className="property-card-secondary-links" aria-label={`${p.name} discovery tools`}>
            <a href="/compare">Compare properties</a>
          </nav>
        </div>
      </details>}
      <div className="property-card-body">
        <div className="search-property-heading">
          <h2><a className="property-card-link" href={`/properties/${p.id}`}>{p.name}</a></h2>
          <div className="search-property-ratings">
            <span>
              <span aria-hidden="true">★</span>
              {p.property_rating == null
                ? <><span className="sr-only">No overall tenant rating</span><span className="search-rating-zero" aria-hidden="true">0</span></>
                : <><span className="sr-only">Overall tenant rating </span>{Number(p.property_rating).toFixed(1)}</>}
            </span>
            {women != null && <span><WomenRatingIcon/><span className="sr-only">Women tenant rating </span>{women.toFixed(1)}</span>}
          </div>
        </div>
        <p className="search-property-location">{[p.locality, p.city].filter(Boolean).join(", ")}</p>
        <p className="rent">{money(p.rent_min)}–{money(p.rent_max)} <small>/ month</small></p>
        <PropertyCriterionScores scores={p.criterion_scores}/>
        {(preferences.length > 0 || verified || p.is_demo) && (
          <ul className="rental-preference-tags" aria-label="Property tags">
            {preferences.map(label => <li key={label}>
              <span className="sr-only">Landlord preference: </span>
              {label === "Women tenants" ? "Women" : label === "Men tenants" ? "Men" : label}
            </li>)}
            {verified && <li className="search-verified-tag"><span aria-hidden="true">✓ </span>{p.is_demo ? "Demo tenants verified" : "Tenant verified"}</li>}
            {p.is_demo && <li className="search-demo-tag">Synthetic example</li>}
          </ul>
        )}
        {shortlisted ? (
          <div className="property-card-actions shortlist-card-actions" role="group" aria-label={`Shortlist actions for ${p.name}`}>
            <CardPhotoUpload property={p.id} name={p.name}/>
            <a className="review-action" href={`/reviews/new?property=${p.id}`}><ActionIcon name="edit"/>Write a review</a>
            <a className="review-action" href={`/compare?property=${p.id}`}>Compare property</a>
            {mapLink}
            <SaveForm property={p.id} saved/>
          </div>
        ) : mapLink}
      </div>
    </article>
  );
}

function PropertyArt() {
  return (
      <div className="property-art" aria-hidden="true">
        <svg viewBox="0 0 160 100" fill="none"><path d="M30 86V43L65 15l35 28v43Z" fill="#fffdf7" stroke="currentColor" strokeWidth="3" /><path d="M56 86V60h19v26M100 86h30V50h-30M40 45h13v13H40M110 60h10v12h-10" stroke="currentColor" strokeWidth="3" /><circle cx="125" cy="19" r="9" fill="#d8bc76" /><path d="M17 86h128" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      </div>
  );
}

const cardCriteria = ["water", "cleanliness", "electricity"];

function PropertyCriterionScores({ scores }: { scores?: Property["criterion_scores"] }) {
  const rated = cardCriteria.flatMap(key => scores?.find(score => score.criterion_key === key) ?? []);
  if (!rated.length) return null;
  return <div className="card-criterion-scores" role="group" aria-label="Average tenant category ratings">
    {rated.map(score => <span key={score.criterion_key}>{score.criterion_key === "electricity" ? "Electricity" : score.label} <strong>{Number(score.rating).toFixed(1)}/5</strong></span>)}
  </div>;
}
