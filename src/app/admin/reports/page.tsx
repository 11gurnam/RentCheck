import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { ReportCard, type Report } from "@/features/moderation/forms";
import {
  PhotoReportCard,
  type PhotoReportRecord,
} from "@/features/photos/forms";
export default async function ReportsPage() {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return (
      <AccountShell>
        <h1>Access restricted.</h1>
      </AccountShell>
    );
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_reports");
  if (error) throw new Error("Reports unavailable");
  const photos = await (
    await createDatabaseClient()
  ).rpc("get_admin_photo_reports");
  if (photos.error) throw new Error("Photo reports unavailable");
  return (
    <AccountShell>
      <h1>Review reports</h1>
      <p>
        Reports leave experiences visible pending investigation. Keep/remove
        decisions require reasons and retain private audit. Deleted or removed
        records are never republished by a keep decision.
      </p>
      {!(data as Report[]).length && <p>No reports yet.</p>}
      {(data as Report[]).map((r) => (
        <ReportCard key={r.id} r={r} />
      ))}
      <h2>Landlord photo reports</h2>
      {!(photos.data as PhotoReportRecord[]).length && (
        <p>No photo reports yet.</p>
      )}
      {(photos.data as PhotoReportRecord[]).map((r) => (
        <PhotoReportCard key={r.id} report={r} />
      ))}
    </AccountShell>
  );
}
