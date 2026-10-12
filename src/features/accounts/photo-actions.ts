"use server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { requireUser, getOwnProfile } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { createMediaClient } from "@/lib/database/privileged";
import { normalizePhoto } from "@/features/reviews/image";
import type { FormState } from "./validation";

export async function uploadProfilePhoto(_: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const profile = await getOwnProfile();
  const file = form.get("photo");
  if (!profile || !(file instanceof File)) return { status:"error", message:"Choose a profile photo." };
  let bytes: Buffer;
  try {
    bytes = await sharp(await normalizePhoto(file)).resize(256,256,{fit:"cover"}).jpeg({quality:85}).toBuffer();
  } catch { return {status:"error",message:"Use a valid JPEG, PNG or WebP photo up to 5 MiB."}; }
  try {
    const media = createMediaClient();
    const photo = crypto.randomUUID();
    const path = `${profile.profile_id}/${photo}.jpg`;
    const upload = await media.storage.from("profile-photos").upload(path,bytes,{contentType:"image/jpeg"});
    if (upload.error) return {status:"error",message:"Photo upload failed. Please try again."};
    const result = await (await createDatabaseClient()).rpc("set_my_profile_photo",{p_photo:photo});
    if (result.error) {
      await media.storage.from("profile-photos").remove([path]);
      return {status:"error",message:"Your profile photo could not be saved."};
    }
    if(result.data) await media.storage.from("profile-photos").remove([result.data]);
  } catch { return {status:"error",message:"Photo upload is unavailable. Please try again."}; }
  revalidatePath("/","layout");
  return {status:"success",message:"Profile photo updated."};
}
