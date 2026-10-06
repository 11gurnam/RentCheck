"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { reviewSchema, type ReviewState } from "./validation";
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
  const input = {
    ...v,
    current: v.current === "true",
    woman: v.woman === "on",
    recommend: v.recommend === "" ? null : v.recommend === "true",
    synthetic: true,
  };
  const id = String(form.get("review") ?? "");
  if (id && !z.uuid().safeParse(id).success)
    return { message: "Invalid review." };
  const db = await createDatabaseClient();
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
