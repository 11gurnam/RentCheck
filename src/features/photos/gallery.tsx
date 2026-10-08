import Image from "next/image";
import { createDatabaseClient } from "@/lib/database/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { PhotoCaption, type PhotoSource } from "./caption";
import { PropertyPhotoForm, PhotoReport } from "./forms";
export async function PropertyGallery({ property }: { property: string }) {
  const db = await createDatabaseClient(),
    user = await getVerifiedUser();
  const { data: photos, error } = await db.rpc("get_property_photos", {
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
  return (
    <section className="history-panel">
      <h2>Landlord photos</h2>
      <p>
        Labels identify who shared each photo and whether their matching claim
        is currently approved. Tenant photos appear with their reviews below.
      </p>
      <div className="photo-grid">
        {(photos as PhotoSource[]).map((ph) => (
          <figure key={ph.id} className="dashboard-card">
            <a href={"/api/photos/" + ph.id}>
              <Image
                src={"/api/photos/" + ph.id}
                width={600}
                height={450}
                unoptimized
                className="review-photo"
                alt={"Property photo shared by landlord " + ph.alias}
              />
            </a>
            <PhotoCaption photo={ph} />
            {user && <PhotoReport photo={ph.id} />}
          </figure>
        ))}
      </div>
      {!(photos as PhotoSource[]).length && <p>No landlord photos yet.</p>}
      {access?.data?.allowed ? (
        <PropertyPhotoForm property={property} own={own?.data ?? []} />
      ) : (
        <p>
          Tenants: add photos from Your reviews → Edit review and photos.
          Landlords:{" "}
          <a href={`/claims/new?kind=property&target=${property}`}>
            submit a matching claim
          </a>{" "}
          to share property photos.
        </p>
      )}
    </section>
  );
}
