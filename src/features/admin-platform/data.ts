import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createDatabaseClient } from "@/lib/database/server";

export type ManagementKind = "properties" | "users" | "reviews" | "cases";
export type Photo = { id: string; name?: string; role?: string };
export type RecordRow = {
  id: string; name: string; status: string; created_at: string; address?: string; city?: string;
  rent_min?: number; rent_max?: number; rating?: number | null; reviews?: number; verified_reviews?: number;
  landlord?: string | null; verified?: boolean; is_demo?: boolean; email?: string; roles?: string[]; admin?: boolean;
  tenant_verified?: boolean; landlord_verified?: boolean; claims?: number | { id: string; status: string }[];
  properties?: { id: string; name: string; claim: string; status: string }[]; report_count?: number;
  body?: string; property_id?: string; property?: string; reports?: number; pending_reports?: number; photos?: Photo[];
  replies?: { id: string; name: string; body: string }[]; kind?: "property" | "tenant" | "landlord" | "review" | "account";
  target_id?: string; reason?: string; assigned?: string; resolution?: string;
  description?: string; applications?: { id: string; kind: "tenant" | "landlord"; property: string; status: string }[];
  tenancies?: {property_id:string;name:string;start:string;end:string|null;review_id:string|null}[];
  cases?: {id:string;kind:string;status:string}[];
  history?: { action: string; reason: string; actor: string | null; created_at: string }[];
};
export type Note = { id: string; body: string; actor: string | null; created_at: string };
export type Overview = {
  properties: number; tenants: number; landlords: number; verified_tenants: number; verified_landlords: number;
  verified_claims: number; pending: number; tenant_pending: number; landlord_pending: number; reviews: number; flagged: number;
  disputes: number; overdue: number; oldest: string | null; verification_states: { label: string; count: number }[];
  cities: { label: string; count: number }[]; trends: { month: string; properties: number; tenants: number; landlords: number; reviews: number; flagged: number }[];
};
const date = z.union([z.literal(""), z.iso.date()]).default("");
export const platformFilters = z.object({
  q: z.string().trim().max(120).default(""), page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.string().max(40).default(""), city: z.string().max(80).default(""),
  sort: z.enum(["newest", "oldest", "name", "rating"]).default("newest"), role: z.enum(["", "tenant", "landlord"]).default(""),
  verified: z.enum(["", "true", "false"]).default(""), landlord_verified: z.enum(["", "true", "false"]).default(""),
  flagged: z.enum(["", "true"]).default(""), rating: z.union([z.literal(""),z.coerce.number().min(0).max(5)]).default(""),
  from: date, to: date, id: z.union([z.literal(""),z.uuid()]).default(""),
});
export type PlatformFilters = z.infer<typeof platformFilters>;
export const overview = cache(async function overview() {
  const { data, error } = await (await createDatabaseClient()).rpc("get_admin_platform_overview");
  if (error) throw new Error("Platform overview is temporarily unavailable.");
  return data as Overview;
});
export async function managementList(kind: ManagementKind, f: PlatformFilters) {
  const { data, error } = await (await createDatabaseClient()).rpc("get_admin_platform_list", { p_kind: kind, p_filters: { ...f, query: f.q } });
  if (error) throw new Error("Management records are temporarily unavailable.");
  return data as { rows: RecordRow[]; total: number; cities: string[]; page: number };
}
export async function recordDetails(kind: ManagementKind, id: string) {
  const { data, error } = await (await createDatabaseClient()).rpc("get_admin_record_details", { p_kind: kind, p_id: id });
  if (error) throw new Error("Record details are unavailable.");
  return data as RecordRow;
}
export async function internalNotes(kind: string, id: string) {
  const { data, error } = await (await createDatabaseClient()).rpc("get_admin_notes", { p_kind: kind, p_target: id });
  if (error) throw new Error("Internal notes are unavailable.");
  return data as Note[];
}
