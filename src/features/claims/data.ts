import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import type { EvidenceDocument } from "@/features/privacy/evidence-upload";
export type Claim = {
  stage?: string | null;
  documents?: EvidenceDocument[]; address?: string;
  is_demo?: boolean;
  evidence_expired?: boolean;
  expires_at?: string;
  id: string;
  property_id: string | null;
  landlord_id: string | null;
  name: string;
  document_id: string;
  status: string;
  reason: string | null;
  alias?: string;
};
/** Current account only; approval always comes from the stored claim decision. */
export async function myProfileClaim(target:string,kind:"property"|"landlord"="property"):Promise<Claim|null> {
  const db=await createDatabaseClient();
  const {data,error}=await db.rpc("get_my_claims");
  if(error)throw new Error("Claim status unavailable");
  const matching=(data as Claim[]).filter(c=>kind==="property"?c.property_id===target:c.landlord_id===target);
  const claim=matching.find(c=>c.status==="approved")??matching.find(c=>["pending","disputed"].includes(c.status))??matching[0];
  if(!claim)return null;
  const stage=await db.rpc("get_my_verification_stage",{p_kind:"landlord",p_application:claim.id});
  if(stage.error)throw new Error("Claim progress unavailable");
  return {...claim,stage:stage.data};
}
export async function myClaims(): Promise<Claim[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_my_claims");
  if (error) throw new Error("Claims unavailable");
  return await Promise.all((data as Claim[]).map(async row => {
    const db = await createDatabaseClient();
    const docs = await db.rpc("get_evidence_documents", {p_primary: row.document_id});
    if (docs.error) throw new Error("Evidence details unavailable");
    const property = row.property_id ? await db.from("properties").select("address").eq("id", row.property_id).maybeSingle() : null;
    const stage = await db.rpc("get_my_verification_stage", {p_kind: "landlord", p_application: row.id});
    if (stage.error) throw new Error("Claim progress unavailable");
    return {...row, stage: stage.data, documents: docs.data as EvidenceDocument[], address: property?.data?.address};
  }));
}
export async function adminClaims(): Promise<Claim[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_claims");
  if (error) throw new Error("Administrator access required");
  return await Promise.all((data as Claim[]).map(async row => {
    const db = await createDatabaseClient();
    const docs = await db.rpc("get_evidence_documents", {p_primary: row.document_id});
    if (docs.error) throw new Error("Evidence details unavailable");
    const property = row.property_id ? await db.from("properties").select("address").eq("id", row.property_id).maybeSingle() : null;
    return {...row, documents: docs.data as EvidenceDocument[], address: property?.data?.address};
  }));
}
