import "server-only";
import type { createMediaClient } from "@/lib/database/privileged";
export async function purgeMedia(
  service: ReturnType<typeof createMediaClient>,
  user: string | null,
  maxBatches = 2,
) {
  // Queue is durable; downloads have already become unavailable in the auth-deletion transaction.
  for (let batch = 0; batch < maxBatches; batch++) {
    const jobs = await service.rpc("get_media_purge_jobs", { p_user: user });
    if (jobs.error) return false;
    const rows = jobs.data as {
      id: string;
      bucket: string;
      object_path: string;
    }[];
    if (!rows.length) return true;
    for (const bucket of ["review-photos", "rental-documents"]) {
      const group = rows.filter((j) => j.bucket === bucket);
      if (!group.length) continue;
      const removed = await service.storage
        .from(bucket)
        .remove(group.map((j) => j.object_path));
      if (removed.error) return false;
      const finished = await service.rpc("finish_media_purge", {
        p_jobs: group.map((j) => j.id),
      });
      if (finished.error) return false;
    }
  }
  const remaining = await service.rpc("get_media_purge_jobs", { p_user: user });
  return !remaining.error && remaining.data?.length === 0;
}
