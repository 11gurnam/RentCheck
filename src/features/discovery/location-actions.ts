"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
export async function saveLocation(_: { message?: string }, form: FormData): Promise<{ message?: string }> {
  await requireUser("/admin");
  if (!(await isAdministrator())) return { message: "Administrator access required." };
  const v = z.object({ property: z.uuid(), precision: z.enum(["approximate", "exact"]), reason: z.string().trim().min(10).max(2000) }).safeParse(Object.fromEntries(form));
  const remove = form.get("remove") === "on", lat = Number(form.get("latitude")), lon = Number(form.get("longitude"));
  if (!v.success || (!remove && (!String(form.get("latitude") ?? "").trim() || !String(form.get("longitude") ?? "").trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < 6 || lat > 38 || lon < 68 || lon > 98))) return { message: "Choose a property, India coordinates and an audit reason." };
  const { error } = await (await createDatabaseClient()).rpc("set_property_location", { p_property: v.data.property, p_latitude: remove ? null : lat, p_longitude: remove ? null : lon, p_precision: v.data.precision, p_reason: v.data.reason });
  if (error) return { message: error.message };
  revalidatePath("/map"); revalidatePath("/admin/locations");
  return { message: "Recorded location updated and audited." };
}
