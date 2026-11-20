"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { rentalPreferencesSchema } from "./preferences";

type Feedback = { status?: "success" | "error"; message?: string };

export async function saveRentalPreferences(_: Feedback, form: FormData): Promise<Feedback> {
  await requireUser();
  const property = z.uuid().safeParse(form.get("property"));
  const preferences = rentalPreferencesSchema.safeParse(form.getAll("eligibility"));
  if (!property.success || !preferences.success)
    return { status: "error", message: "Choose Anyone alone or select valid rental preferences." };
  const { error } = await (await createDatabaseClient()).rpc("set_property_rental_preferences", {
    p_property: property.data, p_values: preferences.data,
  });
  if (error) return { status: "error", message: "Only an approved representative can save preferences for this property." };
  revalidatePath(`/properties/${property.data}`);
  for (const path of ["/search", "/compare", "/saved", "/admin/rental-eligibility"]) revalidatePath(path);
  return { status: "success", message: "Rental preferences saved." };
}
