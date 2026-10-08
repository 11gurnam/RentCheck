import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
export type Claim = {
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
export async function myClaims(): Promise<Claim[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_my_claims");
  if (error) throw new Error("Claims unavailable");
  return data;
}
export async function adminClaims(): Promise<Claim[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_claims");
  if (error) throw new Error("Administrator access required");
  return data;
}
