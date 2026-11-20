import "server-only";

import { createDatabaseClient } from "@/lib/database/server";
import type { WomenSummary } from "@/features/women-program/data";
import type { RentalPreference } from "./preferences";

export type PropertyInformation = {
  property_id: string;
  preferences: RentalPreference[];
  verified_count: number;
  current_count: number;
  former_count: number;
  last_verified_at: string | null;
  women: WomenSummary | null;
  women_recommended: boolean;
};

export async function propertyInformation(ids: string[]) {
  const { data, error } = await (await createDatabaseClient()).rpc("get_public_property_information", { p_properties: ids });
  if (error) throw new Error("Property information unavailable");
  return new Map((data as PropertyInformation[]).map(row => [row.property_id, row]));
}
