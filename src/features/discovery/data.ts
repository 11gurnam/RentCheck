import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import type { Filters } from "./filters";
export type Property = {
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
};
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
  const { data, error } = await db.rpc("search_properties_rated", {
    p_query: filters.q,
    p_state: filters.state,
    p_city: filters.city,
    p_locality: filters.locality,
    p_type: filters.type,
    p_min: filters.min,
    p_max: filters.max,
    p_page: filters.page,
    p_rating: filters.rating,
  });
  if (error) throw new Error("Discovery unavailable");
  return data as Property[];
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
  return data as Property | null;
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
