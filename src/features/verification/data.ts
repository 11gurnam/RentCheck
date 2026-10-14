import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import { womenRecommended } from "./rules";
import type { EvidenceDocument } from "@/features/privacy/evidence-upload";
export type Verification = {
  stage?: string | null;
  documents?: EvidenceDocument[]; address?: string; start_date?: string; end_date?: string | null;
  is_demo?: boolean;
  evidence_expired?: boolean;
  expires_at?: string;
  id: string;
  review_id: string;
  document_id: string;
  status: string;
  reason: string | null;
  alias?: string;
  property?: string;
};
export async function myVerifications(): Promise<Verification[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_my_verifications");
  if (error) throw new Error("Verification unavailable");
  return await Promise.all((data as Verification[]).map(async row => {
    const db = await createDatabaseClient();
    const [docs, context] = await Promise.all([db.rpc("get_evidence_documents", {p_primary: row.document_id}), db.rpc("get_verification_context", {p_request: row.id})]);
    if (docs.error || context.error) throw new Error("Evidence details unavailable");
    const stage = await db.rpc("get_my_verification_stage", {p_kind: "tenant", p_application: row.id});
    if (stage.error) throw new Error("Verification progress unavailable");
    return {...row, ...context.data, stage: stage.data, documents: docs.data as EvidenceDocument[]};
  }));
}
export async function adminVerifications(): Promise<Verification[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_verifications");
  if (error) throw new Error("Administrator access required");
  return await Promise.all((data as Verification[]).map(async row => {
    const db = await createDatabaseClient();
    const [docs, context] = await Promise.all([db.rpc("get_evidence_documents", {p_primary: row.document_id}), db.rpc("get_verification_context", {p_request: row.id})]);
    if (docs.error || context.error) throw new Error("Evidence details unavailable");
    return {...row, ...context.data, documents: docs.data as EvidenceDocument[]};
  }));
}
export async function womensCounts(property: string) {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("womens_recommendation_counts", { p_property: property });
  if (error) throw new Error("Recommendations unavailable");
  const result = data?.[0] as
    | { positive_count: number; eligible_count: number; recommended: boolean }
    | undefined;
  if (
    result &&
    result.recommended !==
      womenRecommended(result.positive_count, result.eligible_count)
  )
    throw new Error("Recommendation summary inconsistent");
  return result;
}
