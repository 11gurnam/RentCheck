"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { createMediaClient } from "@/lib/database/privileged";
import { normalizePhoto } from "@/features/reviews/image";
type State = { message?: string };
function refresh() {
  revalidatePath("/properties", "layout");
  revalidatePath("/admin/reports");
}
export async function uploadPropertyPhoto(
  _: State,
  form: FormData,
): Promise<State> {
  const user = await requireUser("/account");
  const property = z.uuid().safeParse(form.get("property")),
    file = form.get("photo");
  if (!property.success || !(file instanceof File))
    return { message: "Choose a property photo." };
  const { data: access, error } = await (
    await createDatabaseClient()
  ).rpc("get_my_landlord_photo_access", { p_property: property.data });
  if (error || !access?.allowed)
    return {
      message:
        "Declare ownership when adding a place, or submit a matching landlord claim first.",
    };
  let bytes: Buffer;
  try {
    bytes = await normalizePhoto(file);
  } catch {
    return {
      message:
        "Choose a valid JPEG, PNG or WebP image, at most 3 MiB and 20 million pixels.",
    };
  }
  const media = createMediaClient(),
    photo = crypto.randomUUID(),
    path = "property/" + property.data + "/" + photo + ".jpg";
  const uploaded = await media.storage
    .from("review-photos")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (uploaded.error)
    return { message: "Photo upload failed. Please try again." };
  const registration = await media.rpc("register_property_photo", {
    p_user: user.id,
    p_property: property.data,
    p_photo: photo,
  });
  if (registration.error) {
    await media.storage.from("review-photos").remove([path]);
    return { message: registration.error.message };
  }
  refresh();
  return {
    message:
      "Landlord photo added. Its verification label follows your current approved claim. Image metadata was removed.",
  };
}
export async function removePropertyPhoto(
  _: State,
  form: FormData,
): Promise<State> {
  await requireUser("/account");
  const id = z.uuid().safeParse(form.get("photo"));
  if (!id.success) return { message: "Invalid photo." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("remove_property_photo", { p_photo: id.data });
  if (error) return { message: "Only the uploader can remove this photo." };
  refresh();
  return { message: "Photo removed from public access." };
}
export async function reportPropertyPhoto(
  _: State,
  form: FormData,
): Promise<State> {
  await requireUser("/account");
  const v = z
    .object({ photo: z.uuid(), reason: z.string().trim().min(10).max(2000) })
    .safeParse(Object.fromEntries(form));
  if (!v.success)
    return { message: "Enter a report reason of 10–2000 characters." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("report_property_photo", {
    p_photo: v.data.photo,
    p_reason: v.data.reason,
  });
  if (error) return { message: "Could not report this photo." };
  refresh();
  return { message: "Photo reported. It remains visible pending review." };
}
export async function decidePhotoReport(
  _: State,
  form: FormData,
): Promise<State> {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return { message: "Administrator access required." };
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
  ).rpc("decide_photo_report", {
    p_report: v.data.report,
    p_decision: v.data.decision,
    p_reason: v.data.reason,
  });
  if (error) return { message: error.message };
  refresh();
  return { message: "Photo report decided and audited." };
}
