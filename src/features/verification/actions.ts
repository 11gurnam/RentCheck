"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { createMediaClient } from "@/lib/database/privileged";
import { ownReviews } from "@/features/reviews/data";
import { normalizePhoto } from "@/features/reviews/image";
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
      message: "Choose a fictional document image and confirm it is synthetic.",
    };
  const review = (await ownReviews()).find(
    (r) => r.id === id.data && r.status === "visible",
  );
  if (!review)
    return { message: "Only the author can verify a visible review." };
  let bytes: Buffer;
  try {
    bytes = await normalizePhoto(file);
  } catch {
    return {
      message:
        "Use a valid non-animated fictional JPEG, PNG or WebP document image, up to 5 MiB and 20 million pixels.",
    };
  }
  const media = createMediaClient();
  const document = crypto.randomUUID();
  const path = "verification/" + document + ".jpg";
  const upload = await media.storage
    .from("rental-documents")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (upload.error)
    return { message: "Private upload failed. Please try again." };
  const result = await media.rpc("register_verification_document", {
    p_user: user.id,
    p_review: id.data,
    p_document: document,
  });
  if (result.error) {
    await media.storage.from("rental-documents").remove([path]);
    return { message: result.error.message };
  }
  revalidatePath("/reviews/" + id.data + "/edit");
  revalidatePath("/admin/verification");
  return {
    status: "success", message:
      "Private demonstration verification requested. Only you and trusted administrators can access the document.",
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
  });
  if (error) return { message: error.message };
  revalidatePath("/admin/verification");
  revalidatePath("/properties", "layout");
  revalidatePath("/reviews", "layout");
  revalidatePath("/search");
  return {
    status: "success", message: "Demonstration decision saved with an immutable audit record.",
  };
}
