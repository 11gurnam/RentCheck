export type PhotoSource = {
  id: string;
  alias: string;
  role: "tenant" | "landlord";
  verified: boolean;
  is_demo: boolean;
};
export function PhotoCaption({ photo }: { photo: PhotoSource }) {
  return (
    <figcaption>
      <strong>Shared by {photo.role}</strong> · {photo.alias}
      <span className="demo-tag">
        {photo.verified ? "Verified" : "Unverified"} {photo.role}
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
