import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import { womenRecommended } from "./rules";
export type Verification = {
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
  return data;
}
export async function adminVerifications(): Promise<Verification[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_verifications");
  if (error) throw new Error("Administrator access required");
  return data;
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
