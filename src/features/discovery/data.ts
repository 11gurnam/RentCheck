import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import type { Filters } from "./filters";
export type Property = {
  criterion_scores: CriterionScore[];
  id: string;
  name: string;
  address: string;
  state: string;
  city: string;
  locality: string;
  property_type: string;
  rent_min: number;
  rent_max: number;
  description: string;
  is_demo: boolean;
  landlord_id: string | null;
  landlord_name: string | null;
  total_count: number;
  property_rating: number | null;
  review_count: number;
  positive_count: number;
  eligible_count: number;
  recommended: boolean;
};
export type CriterionScore = { criterion_key: string; label: string; rating: number; review_count: number };
export type Association = {
  id: string;
  property_id: string;
  landlord_id: string;
  start_date: string;
  end_date: string | null;
};
export type Landlord = {
  id: string;
  name: string;
  description: string;
  is_demo: boolean;
};
export async function searchProperties(filters: Filters) {
  const db = await createDatabaseClient();
  const { data, error } = await db.rpc("search_properties_verified", {
    p_query: filters.q,
    p_state: filters.state,
    p_city: filters.city,
    p_locality: filters.locality,
    p_type: filters.type,
    p_min: filters.min,
    p_max: filters.max,
    p_page: filters.page,
    p_rating: filters.rating,
    p_women: filters.women === "recommended",
  });
  if (error) throw new Error("Discovery unavailable");
  const properties = data as Property[];
  if (!properties.length) return properties;
  const scores = await db.from("property_criterion_scores").select("*").in("property_id", properties.map(p => p.id));
  if (scores.error) throw new Error("Criterion scores unavailable");
  return properties.map(p => ({ ...p, criterion_scores: (scores.data ?? []).filter(s => s.property_id === p.id) as CriterionScore[] }));
}
export async function getLocations() {
  const db = await createDatabaseClient();
  const { data, error } = await db
    .from("properties")
    .select("state,city,locality")
    .order("city");
  if (error) throw new Error("Locations unavailable");
  return data as { state: string; city: string; locality: string }[];
}
export async function getProperty(id: string) {
  const db = await createDatabaseClient();
  const { data, error } = await db
    .from("property_discovery")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Property unavailable");
  if (!data) return null;
  const scores = await db
    .from("property_scores")
    .select("property_rating,review_count")
    .eq("property_id", id)
    .maybeSingle();
  const counts = await db.rpc("womens_recommendation_counts", {
    p_property: id,
  });
  if (scores.error || counts.error)
    throw new Error("Property scores unavailable");
  return {
    ...data,
    property_rating: scores.data?.property_rating ?? null,
    review_count: scores.data?.review_count ?? 0,
    ...counts.data?.[0],
  } as Property;
}
export async function getAssociations(
  propertyId?: string,
  landlordId?: string,
) {
  const db = await createDatabaseClient();
  let query = db
    .from("management_associations")
    .select("*")
    .order("start_date", { ascending: false });
  if (propertyId) query = query.eq("property_id", propertyId);
  if (landlordId) query = query.eq("landlord_id", landlordId);
  const { data, error } = await query;
  if (error) throw new Error("History unavailable");
  return data as Association[];
}
export async function getLandlord(id: string) {
  const db = await createDatabaseClient();
  const { data, error } = await db
    .from("landlords")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Manager unavailable");
  return data as Landlord | null;
}
