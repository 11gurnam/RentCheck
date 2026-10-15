import { createDatabaseClient } from "@/lib/database/server";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ActionIcon } from "@/components/ui/action-feedback";
export async function PropertyClaimStatus({ property }: { property: string }) {
 const {data,error}=await (await createDatabaseClient()).rpc("get_verified_property_representatives",{p_property:property});
 if(error)return <p role="status">Property claim status is temporarily unavailable.</p>;
 const representatives=(data??[]) as {alias:string;avatar_url:string|null;is_demo:boolean}[];
 return <div className="property-claim-status">{representatives.length ? representatives.map(r=><div className="review-author" key={r.alias}><ProfileAvatar name={r.alias} src={r.avatar_url}/><div><strong>{r.alias}</strong><span className="verified-response-label"><ActionIcon name="shield"/>{r.is_demo?"Demonstration Landlord":"Verified Landlord"} · property claim approved</span></div></div>) : <p className="field-hint">No verified landlord yet.</p>}</div>;
}
