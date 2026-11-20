import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import type { ProgramPreferences, RatingKey } from "./fields";

export async function myWomenProgram(review?: string) {
  const db = await createDatabaseClient();
  const { data, error } = await db.rpc("get_my_women_program", review ? { p_review: review } : {});
  if (error) throw new Error("Private program preferences are unavailable.");
  return data as ProgramPreferences | null;
}

export type WomenSummary = {
  count: number;
  rating: number;
  recommendation: number;
  categories: Partial<Record<RatingKey, number>>;
  recent: Partial<Record<RatingKey, number>>;
};

export async function womenAdminSummary() {
  const db = await createDatabaseClient();
  const { data, error } = await db.rpc("get_admin_women_program");
  if (error) throw new Error("Women’s program statistics are unavailable.");
  return data as { enrolled: number; verified: number; contributions: number; pending: number; flagged: number; reports: number };
}
