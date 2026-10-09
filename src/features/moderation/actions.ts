"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import type { ReviewState } from "@/features/reviews/validation";
import { reportSchema, mergeSchema, associationSchema } from "./validation";
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/properties", "layout");
  revalidatePath("/landlords", "layout");
  revalidatePath("/search");
  revalidatePath("/saved");
  revalidatePath("/claims");
  revalidatePath("/account/reviews");
}
async function admin() {
  await requireUser("/admin");
  return isAdministrator();
}
export async function reportReview(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/account");
  const v = reportSchema.safeParse({
    review: form.get("review"),
    reason: form.get("reason"),
  });
  if (!v.success)
    return { message: "Enter a report reason of 10–2000 characters." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("report_review", { p_review: v.data.review, p_reason: v.data.reason });
  if (error) return { message: error.message };
  refresh();
  return {
    status: "success", message:
      "Report submitted. The review remains visible while an administrator investigates.",
  };
}
export async function decideReport(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  if (!(await admin())) return { message: "Administrator access required." };
  const v = z
    .object({
      report: z.uuid(),
      decision: z.enum(["kept", "removed"]),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!v.success) return { message: "Choose a decision and enter a reason." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("decide_report", {
    p_report: v.data.report,
    p_decision: v.data.decision,
    p_reason: v.data.reason,
  });
  if (error) return { message: error.message };
  refresh();
  return { status: "success", message: "Report decision saved and audited." };
}
export async function markDistinct(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  if (!(await admin())) return { message: "Administrator access required." };
  const v = z
    .object({
      candidate: z.uuid(),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!v.success)
    return { message: "Enter a valid candidate and decision reason." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("mark_duplicate_distinct", {
    p_candidate: v.data.candidate,
    p_reason: v.data.reason,
  });
  if (error) return { message: error.message };
  refresh();
  return { status: "success", message: "Profiles kept distinct; decision audited." };
}
export async function mergeProperties(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  if (!(await admin())) return { message: "Administrator access required." };
  const v = mergeSchema.safeParse({
    ...Object.fromEntries([...form].filter(([k]) => !k.startsWith("$ACTION_"))),
    archive: form.getAll("archive"),
    revoke: form.getAll("revoke"),
  });
  if (!v.success)
    return { message: v.error.issues.map((i) => i.message).join(" ") };
  const d = v.data;
  const { error } = await (
    await createDatabaseClient()
  ).rpc("merge_properties", {
    p_source: d.source,
    p_target: d.target,
    p_archive: d.archive,
    p_revoke: d.revoke,
    p_history: d.history,
    p_details: d.details,
    p_reason: d.reason,
  });
  if (error) return { message: error.message };
  refresh();
  redirect("/admin/merge?notice=merged");
}
export async function maintainAssociation(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  if (!(await admin())) return { message: "Administrator access required." };
  const v = associationSchema.safeParse(Object.fromEntries(form));
  if (!v.success)
    return {
      message: "Choose profiles, valid start/end dates and an audit reason.",
    };
  const d = v.data;
  const { error } = await (
    await createDatabaseClient()
  ).rpc("maintain_association", {
    p_property: d.property,
    p_landlord: d.landlord,
    p_start: d.start,
    p_end: d.end || null,
    p_replace: d.replace || null,
    p_reason: d.reason,
  });
  if (error) return { message: error.message };
  refresh();
  return {
    message:
      "Management history saved. Existing tenant manager snapshots remain unchanged.",
    status: "success",
  };
}
export async function createManager(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  if (!(await admin())) return { message: "Administrator access required." };
  const v = z
    .object({
      name: z.string().trim().min(3).max(120),
      description: z.string().trim().max(3000),
      reason: z.string().trim().min(10).max(2000),
      synthetic: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!v.success)
    return {
      message:
        "Enter fictional manager details, an audit reason and confirm invented information.",
    };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("create_manager_profile", {
    p_name: v.data.name,
    p_description: v.data.description,
    p_acknowledged: form.get("acknowledged") === "on",
    p_reason: v.data.reason,
  });
  if (error) return { message: error.message };
  refresh();
  return { status: "success", message: "Fictional manager profile created and audited." };
}
