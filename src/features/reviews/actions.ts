"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { reviewSchema, criteriaSchema, type ReviewState } from "./validation";
import { criteriaFor, overallRating } from "./criteria";
import { z } from "zod";
export async function submitReview(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/account/reviews");
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { message: parsed.error.issues.map((i) => i.message).join(" ") };
  const v = parsed.data;
  let rawCriteria: unknown;
  try { rawCriteria = JSON.parse(String(form.get("criteria") ?? "")); }
  catch { return { message: "Rate each of the property’s criteria before saving." }; }
  const rated = criteriaSchema.safeParse(rawCriteria);
  if (!rated.success) return { message: rated.error.issues.map(i => i.message).join(" ") };
  const db = await createDatabaseClient();
  const property = await db.from("properties").select("property_type").eq("id", v.property).maybeSingle();
  if (property.error || !property.data) return { message: "Property unavailable." };
  const standards = criteriaFor(property.data.property_type);
  if (standards.some(c => !rated.data.some(r => !r.custom && r.key === c.key && r.label === c.label)) ||
      rated.data.some(r => r.custom ? !r.key.startsWith("custom_") : !standards.some(c => c.key === r.key && c.label === r.label)))
    return { message: "Rate all criteria for this accommodation type." };
  const input = {
    ...v,
    criteria: rated.data,
    propertyRating: overallRating(rated.data),
    current: v.current === "true",
    woman: v.woman === "on",
    recommend: v.recommend === "" ? null : v.recommend === "true",
    synthetic: true,
  };
  const id = String(form.get("review") ?? "");
  if (id && !z.uuid().safeParse(id).success)
    return { message: "Invalid review." };
  const result = id
    ? await db.rpc("edit_review", { p_review: id, p_input: input })
    : await db.rpc("create_review", { p_input: input });
  if (result.error) return { message: result.error.message };
  if (result.data?.status === "overlap")
    return {
      message:
        "These dates overlap your existing tenancy. Edit that review instead. The conflict has been flagged privately.",
    };
  if (result.data?.status === "exists")
    return {
      message:
        "You already reviewed this tenancy. Open Your reviews to edit it; another review was not created.",
    };
  revalidatePath("/properties/" + v.property);
  revalidatePath("/account/reviews");
  revalidatePath("/search");
  redirect("/account/reviews");
}
export async function removeReview(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/account/reviews");
  const id = String(form.get("review"));
  if (!z.uuid().safeParse(id).success) return { message: "Invalid review." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("delete_review", { p_review: id });
  if (error) return { message: error.message };
  revalidatePath("/account/reviews");
  revalidatePath("/properties", "layout");
  return {
    message: "Review deleted. It no longer contributes to public ratings.",
  };
}
export async function closeTenancy(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/account/reviews");
  const id = z.uuid().safeParse(form.get("review"));
  const end = z.iso.date().safeParse(form.get("end"));
  const paid = z.coerce
    .number()
    .int()
    .min(0)
    .max(10000000)
    .safeParse(form.get("paid"));
  if (!id.success || !end.success || !paid.success)
    return { message: "Check end date and rent." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("update_tenancy", {
    p_review: id.data,
    p_current: false,
    p_end: end.data,
    p_paid: paid.data,
  });
  if (error) return { message: error.message };
  revalidatePath("/account/reviews");
  return { message: "Tenancy end saved." };
}
