import { ProfileAvatar } from "@/components/ui/profile-avatar";
export type PhotoSource = {
  avatar_url?: string | null;
  identity_verified?: boolean;
  review_href?: string;
  id: string;
  alias: string;
  role: "tenant" | "landlord";
  verified: boolean;
  is_demo: boolean;
};
export function PhotoCaption({ photo }: { photo: PhotoSource }) {
  return (
    <figcaption>
      <div className="photo-uploader"><ProfileAvatar name={photo.alias || "Uploader unavailable"} src={photo.avatar_url} /><div><strong>{photo.alias || "Uploader unavailable"}</strong><small>Shared by {photo.role || "user"}</small></div></div>
      <span className={photo.verified && !photo.is_demo && photo.role === "landlord" ? "photo-verified-badge" : "demo-tag"}>
        {photo.role === "landlord" ? photo.identity_verified === true && !photo.is_demo ? "Verified Landlord" : photo.verified ? photo.is_demo ? "Demonstration claim approved" : "Verified Landlord · property claim approved" : "Landlord · identity not verified" : photo.verified ? photo.is_demo ? "Demonstration verified tenant" : "Tenant · evidence reviewed" : "Tenant"}
      </span>
      {photo.is_demo && (
        <span className="field-hint">
          Fictional photo ·{" "}
          {photo.verified ? "demonstration approval" : "not verified"}
        </span>
      )}
      {!photo.is_demo && photo.verified && <span className="field-hint">Evidence manually reviewed · identity not independently certified</span>}
    </figcaption>
  );
}
