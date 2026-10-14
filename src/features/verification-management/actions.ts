"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import type { ReviewState } from "@/features/reviews/validation";
export async function manageApplication(_: ReviewState, form: FormData): Promise<ReviewState> {
  await requireUser("/admin/verification-management");
  if (!(await isAdministrator())) return { message: "Administrator access required." };
  const parsed = z.object({ kind: z.enum(["tenant", "landlord"]), application: z.uuid(), action: z.enum(["assign", "request_information", "approved", "rejected", "revoked", "disputed"]), reason: z.string().trim().min(10).max(2000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Select an action and enter a reason of 10–2000 characters." };
  const checks = Object.fromEntries(["identity", "property", "period_or_authority", "readable", "complete", "valid"].map(key => [key, form.get(key) === "on"]));
  const { error } = await (await createDatabaseClient()).rpc("manage_verification", { p_kind: parsed.data.kind, p_application: parsed.data.application, p_action: parsed.data.action, p_reason: parsed.data.reason, p_checks: checks });
  if (error) return { message: error.message };
  for (const path of ["/admin", "/account", "/claims", "/reviews", "/properties", "/landlords"]) revalidatePath(path, "layout");
  revalidatePath("/search");
  return { status: "success", message: "Application updated. The action was audited and the applicant notified when a decision or information request was made." };
}
