"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";

import { ownReviews } from "@/features/reviews/data";
import { submitEvidenceBundle } from "@/features/privacy/evidence";
import type { ReviewState } from "@/features/reviews/validation";
export async function requestVerification(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  const user = await requireUser("/account/reviews");
  const id = z.uuid().safeParse(form.get("review"));
  const file = form.get("document");
  if (!id.success || !(file instanceof File) || form.get("synthetic") !== "on")
    return {
      message: "Choose supporting documents and confirm your consent.",
    };
  const review = (await ownReviews()).find(
    (r) => r.id === id.data && r.status === "visible",
  );
  if (!review)
    return { message: "Only the author can verify a visible review." };
  const result = await submitEvidenceBundle(user.id, form, { review: id.data, demo: review.is_demo !== false });
  if (result.message) return { message: result.message };
  revalidatePath("/reviews/" + id.data + "/edit");
  revalidatePath("/admin/verification");
  return {
    status: "success", message:
      review.is_demo !== false ? "Private demonstration verification requested. Only you and trusted administrators can access the document." : "Private evidence submitted for manual tenancy review. Only you and trusted administrators can access the document.",
  };
}
export async function decideVerification(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return { message: "Administrator access required." };
  const input = z
    .object({
      request: z.uuid(),
      decision: z.enum(["approved", "rejected", "revoked"]),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      message: "Choose a decision and enter a reason of 10–2000 characters.",
    };
  const v = input.data;
  const { error } = await (
    await createDatabaseClient()
  ).rpc("decide_verification", {
    p_request: v.request,
    p_decision: v.decision,
    p_reason: v.reason,
    p_checks: { identity: form.get("identity") === "on", property: form.get("property") === "on", period_or_authority: form.get("period_or_authority") === "on", readable: form.get("readable") === "on", complete: form.get("complete") === "on", valid: form.get("valid") === "on" },
  });
  if (error) return { message: error.message };
  revalidatePath("/admin/verification");
  revalidatePath("/properties", "layout");
  revalidatePath("/reviews", "layout");
  revalidatePath("/search");
  return {
    status: "success", message: "Verification decision saved and audited.",
  };
}
