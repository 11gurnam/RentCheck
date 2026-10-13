import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import type { EvidenceDocument } from "@/features/privacy/evidence-upload";
export type Application = {
  id: string; kind: "tenant" | "landlord"; alias: string; avatar_url: string | null;
  property_id: string; property: string; address: string; status: string; backend_status: string;
  created_at: string; assigned_name: string | null; is_demo: boolean; reason: string | null;
};
export type ApplicationDetails = Application & {
  email: string; applicant_id: string; review_id: string | null; start_date: string | null;
  end_date: string | null; decided_at: string | null; documents: EvidenceDocument[];
  history: { id: string; action: string; reason: string; created_at: string; actor: string | null; before: Record<string, unknown>; after: Record<string, unknown> }[];
  conflicts: { id: string; alias: string; status: string }[];
};
export async function verificationManagement(filters: { query: string; type: string; status: string; sort: string; page: number }) {
  const { data, error } = await (await createDatabaseClient()).rpc("get_verification_management", {
    p_query: filters.query, p_type: filters.type, p_status: filters.status, p_sort: filters.sort, p_page: filters.page,
  });
  if (error) throw new Error("Verification management is temporarily unavailable.");
  return data as { rows: Application[]; total: number; page: number; summary: { pending: number; tenants: number; landlords: number; rejected: number; disputed: number } };
}
export async function verificationApplication(kind: string, id: string) {
  const { data, error } = await (await createDatabaseClient()).rpc("get_verification_application", { p_kind: kind, p_application: id });
  if (error) throw new Error("Verification application is unavailable.");
  return data as ApplicationDetails;
}
export function statusLabel(status: string) {
  return ({ pending: "Pending", under_review: "Under Review", awaiting_information: "Awaiting Applicant Information", verified: "Verified", rejected: "Rejected", disputed: "Disputed", revoked: "Revoked" } as Record<string, string>)[status] ?? status;
}
