import type { Claim } from "./data";
import { ActionIcon, StatusBadge } from "@/components/ui/action-feedback";
import { CameraIcon } from "@/components/ui/camera-icon";

export function PropertyClaimActions({property,claim,owner}:{property:string;claim:Claim|null;owner:boolean}) {
 const href=claim?`/claims#claim-${claim.id}`:"/claims";
 if(claim?.status==="approved")return <>
  <StatusBadge status="approved">{claim.is_demo?"Demo claim approved":"Property claim approved"}</StatusBadge>
  <a className="primary-link" href={href}><ActionIcon name="edit"/>Manage property</a>
  <a className="property-secondary-action camera-action" href={`/properties/${property}#landlord-photo-tools`}><CameraIcon/>Manage property photos</a>
 </>;
 if(claim&&["pending","disputed"].includes(claim.status))return <>
  <StatusBadge status={claim.status}>{claim.status==="disputed"?"Claim disputed":claim.stage==="awaiting_information"?"Claim needs information":claim.stage==="under_review"?"Claim under review":"Claim awaiting review"}</StatusBadge>
  <a className="primary-link" href={href}><ActionIcon name="shield"/>{claim.stage==="awaiting_information"?"Provide requested information":"View claim status"}</a>
 </>;
 return <>{claim&&<StatusBadge status={claim.status}>Claim {claim.status}</StatusBadge>}<a className="property-secondary-action" href={`/claims/new?kind=property&target=${property}`}><ActionIcon name="shield"/>{claim?"Submit a new claim":owner?"Verify property ownership":"Claim this property"}</a></>;
}
