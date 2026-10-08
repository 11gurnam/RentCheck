export async function runCleanup(service, deadline = Date.now() + 15000) {
  const ensure = (result) => { if (result.error) throw new Error("Media cleanup service failed; queued jobs remain retryable."); return result.data; };
  for (let batch = 0; batch < 5 && Date.now() < deadline; batch++) {
    ensure(await service.rpc("queue_expired_evidence", { p_limit: 100 }));
    ensure(await service.rpc("queue_retired_photos", { p_limit: 100 }));
    const jobs = ensure(await service.rpc("get_media_purge_jobs", { p_user: null }));
    if (!jobs.length) return { complete: true };
    if (jobs.some(job => !["rental-documents", "review-photos"].includes(job.bucket) || !job.object_path || job.object_path.includes(".."))) throw new Error("Unexpected media cleanup job; operator inspection required.");
    for (const bucket of ["rental-documents", "review-photos"]) {
      const rows = jobs.filter(job => job.bucket === bucket);
      if (!rows.length) continue;
      if (Date.now() >= deadline) return { complete: false };
      ensure(await service.storage.from(bucket).remove(rows.map(job => job.object_path)));
      ensure(await service.rpc("finish_media_purge", { p_jobs: rows.map(job => job.id) }));
    }
  }
  return { complete: false };
}
