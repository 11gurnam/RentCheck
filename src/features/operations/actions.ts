"use server";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createMediaClient } from "@/lib/database/privileged";
import { purgeMedia } from "@/features/privacy/purge";
export async function retryCleanup(_: { message?: string }, form: FormData): Promise<{ message?: string }> {
  await requireUser("/admin");
  if (!(await isAdministrator())) return { message: "Administrator access required." };
  if (form.get("confirmed") !== "on") return { message: "Confirm removal of expired evidence and retired photos." };
  const client = createMediaClient();
  const queued = await client.rpc("queue_expired_evidence", { p_limit: 100 }), photos = await client.rpc("queue_retired_photos", { p_limit: 100 });
  if (queued.error || photos.error) return { message: "Could not prepare cleanup. Please retry." };
  const complete = await purgeMedia(client, null, 2);
  revalidatePath("/admin/operations"); revalidatePath("/reviews", "layout"); revalidatePath("/claims");
  return { message: complete ? "Cleanup completed. No queued media jobs remain." : "Cleanup has remaining jobs or storage is unavailable. Retry safely." };
}
