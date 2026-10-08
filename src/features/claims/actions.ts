"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { createMediaClient } from "@/lib/database/privileged";
import { normalizeDocument } from "@/features/privacy/document";
import type { ReviewState } from "@/features/reviews/validation";
import { detailsSchema, replySchema } from "./validation";
export async function requestClaim(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  const user = await requireUser("/claims");
  const target = z.uuid().safeParse(form.get("target"));
  const kind = z.enum(["property", "landlord"]).safeParse(form.get("kind"));
  const file = form.get("document");
  if (
    !target.success ||
    !kind.success ||
    !(file instanceof File) ||
    form.get("synthetic") !== "on"
  )
    return { message: "Choose a valid profile and fictional evidence image." };
  const db = await createDatabaseClient();
  const profile = await db
    .from(kind.data === "property" ? "properties" : "landlords")
    .select("id,is_demo")
    .eq("id", target.data)
    .maybeSingle();
  if (profile.error || !profile.data)
    return { message: "Profile unavailable." };
  let documentFile: Awaited<ReturnType<typeof normalizeDocument>>;
  try {
    documentFile = await normalizeDocument(file);
  } catch {
    return {
      message:
        "Use a valid fictional JPEG, PNG, WebP or PDF, up to 5 MiB. PDFs must have at most 30 pages, without encryption, scripts, attachments or interactive forms.",
    };
  }
  const media = createMediaClient();
  const document = crypto.randomUUID();
  const path = "claim/" + document + "." + documentFile.extension;
  const result = await media.storage
    .from("rental-documents")
    .upload(path, documentFile.bytes, {
      contentType: documentFile.mime,
      upsert: false,
    });
  if (result.error) return { message: "Private evidence upload failed." };
  const claim = await media.rpc("register_evidence_document", {
    p_user: user.id,
    p_property: kind.data === "property" ? target.data : null,
    p_landlord: kind.data === "landlord" ? target.data : null,
    p_document: document,
    p_extension: documentFile.extension,
    p_demo: profile.data.is_demo,
    p_consent: true,
  });
  if (claim.error) {
    await media.storage.from("rental-documents").remove([path]);
    return { message: claim.error.message };
  }
  revalidatePath("/claims");
  revalidatePath("/admin/claims");
  return {
    message:
      profile.data.is_demo ? "Private demonstration claim submitted. Approval is required before you can change details or reply." : "Private evidence submitted for manual representative review. Approval is required before changing details or replying.",
  };
}
export async function decideClaim(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return { message: "Administrator access required." };
  const v = z
    .object({
      claim: z.uuid(),
      decision: z.enum(["approved", "rejected", "revoked"]),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!v.success)
    return {
      message: "Choose a decision and enter a reason of 10–2000 characters.",
    };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("decide_claim", {
    p_claim: v.data.claim,
    p_decision: v.data.decision,
    p_reason: v.data.reason,
    p_checks: { identity: form.get("identity") === "on", property: form.get("property") === "on", period_or_authority: form.get("period_or_authority") === "on" },
  });
  if (error) return { message: error.message };
  revalidatePath("/admin/claims");
  revalidatePath("/claims");
  revalidatePath("/properties", "layout");
  revalidatePath("/landlords", "layout");
  return { message: "Demonstration claim decision saved and audited." };
}
export async function updateDetails(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/claims");
  const values = Object.fromEntries(
    [...form].filter(([k]) => !k.startsWith("$ACTION_")),
  );
  const v = detailsSchema.safeParse(values);
  if (!v.success)
    return { message: v.error.issues.map((i) => i.message).join(" ") };
  const { claim, ...input } = v.data;
  const { error } = await (
    await createDatabaseClient()
  ).rpc("update_claimed_details", { p_claim: claim, p_input: input });
  if (error) return { message: error.message };
  revalidatePath("/claims");
  revalidatePath("/properties", "layout");
  revalidatePath("/landlords", "layout");
  revalidatePath("/search");
  return { message: "Permitted details updated and audited." };
}
export async function replyToReview(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/claims");
  const v = replySchema.safeParse(
    Object.fromEntries([...form].filter(([k]) => !k.startsWith("$ACTION_"))),
  );
  if (!v.success)
    return {
      message: "Reply needs 10–3000 characters and an approved matching claim.",
    };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("upsert_claimant_reply", {
    p_claim: v.data.claim,
    p_review: v.data.review,
    p_body: v.data.body,
  });
  if (error) return { message: error.message };
  revalidatePath("/properties", "layout");
  revalidatePath("/landlords", "layout");
  return {
    message:
      "Your representative reply was saved. The tenant review is unchanged.",
  };
}
