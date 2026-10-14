import { PhotoMedia } from "./media";
import { createDatabaseClient } from "@/lib/database/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { type PhotoSource } from "./caption";
import { PropertyPhotoForm, PhotoReport } from "./forms";
export async function PropertyGallery({ property }: { property: string }) {
  const db = await createDatabaseClient(),
    user = await getVerifiedUser();
  const { data: photos, error } = await db.rpc("get_property_gallery", {
    p_property: property,
  });
  if (error) throw new Error("Photos unavailable");
  const access = user
    ? await db.rpc("get_my_landlord_photo_access", { p_property: property })
    : null;
  const own = user
    ? await db.rpc("get_my_property_photos", { p_property: property })
    : null;
  if (access?.error || own?.error) throw new Error("Photo access unavailable");
  const propertyPhotos = ((photos ?? []) as PhotoSource[]).filter(photo => photo.role !== "tenant");
  return (
    <section className="history-panel property-top-gallery" id="property-photos">
      <h2>Photos of this place</h2>
      <p>
        Property media, with the original uploader shown on each photo.
      </p>
      {propertyPhotos.length ? <PhotoMedia photos={propertyPhotos} title="Property photos" /> : <div className="property-media-empty"><strong>Property photos coming soon</strong><p>Photos documenting the property will appear here. Tenant attachments stay with their reviews below.</p></div>}
      {user && propertyPhotos.length > 0 && <details className="gallery-photo-tools"><summary>Report a property photo</summary>{propertyPhotos.map((photo, i) => <div key={photo.id}><p>Photo {i + 1} · {photo.alias}</p><PhotoReport photo={photo.id} /></div>)}</details>}
      {access?.data?.allowed ? (
        <details className="gallery-photo-tools"><summary>Add or manage landlord photos</summary><PropertyPhotoForm property={property} own={own?.data ?? []} /></details>
      ) : (
        <details className="gallery-photo-tools"><summary>Photo upload options</summary><p>
          Tenants: add photos from Your reviews → Edit review and photos.
          Landlords:{" "}
          <a href={`/claims/new?kind=property&target=${property}`}>
            submit a matching claim
          </a>{" "}
          to share property photos.
        </p></details>
      )}
    </section>
  );
}
