"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createMediaClient } from "@/lib/database/privileged";
import { createDatabaseClient } from "@/lib/database/server";
import { ownReviews } from "./data";
import { normalizePhoto } from "./image";
import type { ReviewState } from "./validation";
export async function addPhoto(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  const user = await requireUser("/account/reviews");
  const id = z.uuid().safeParse(form.get("review"));
  const file = form.get("photo");
  if (!id.success || !(file instanceof File))
    return { message: "Choose a photo." };
  const review = (await ownReviews()).find(
    (r) => r.id === id.data && r.status === "visible",
  );
  if (!review) return { message: "Only the author can add photos." };
  let bytes: Buffer;
  try {
    bytes = await normalizePhoto(file);
  } catch {
    return {
      message:
        "Photo rejected. Use a valid non-animated JPEG, PNG or WebP, at most 3 MiB and 20 million pixels.",
    };
  }
  const media = createMediaClient();
  const photo = crypto.randomUUID();
  const path = id.data + "/" + photo + ".jpg";
  const result = await media.storage
    .from("review-photos")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (result.error)
    return { message: "Photo upload failed. Please try again." };
  const registration = await media.rpc("register_review_photo", {
    p_user: user.id,
    p_review: id.data,
    p_photo: photo,
  });
  if (registration.error) {
    await media.storage.from("review-photos").remove([path]);
    return { message: registration.error.message };
  }
  revalidatePath("/reviews/" + id.data + "/edit");
  revalidatePath("/properties/" + review.property_id);
  return {
    message: "Photo added. Location and other image metadata were stripped.",
  };
}
export async function removePhoto(
  _: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  await requireUser("/account/reviews");
  const id = z.uuid().safeParse(form.get("photo"));
  if (!id.success) return { message: "Invalid photo." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("remove_review_photo", { p_photo: id.data });
  if (error) return { message: "Only the author can remove this photo." };
  revalidatePath("/reviews", "layout");
  revalidatePath("/properties", "layout");
  return { message: "Photo removed from public access." };
}
