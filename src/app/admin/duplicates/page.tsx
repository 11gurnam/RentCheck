import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { DuplicateCard, type Duplicate } from "@/features/moderation/forms";
export default async function DuplicatesPage() {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return (
      <AccountShell>
        <h1>Access restricted.</h1>
      </AccountShell>
    );
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_admin_duplicates");
  if (error) throw new Error("Duplicate queue unavailable");
  return (
    <AccountShell>
      <h1>Possible duplicate properties</h1>
      <p>
        Similar profiles are candidates, not confirmed duplicates. Inspect both
        profiles and decide explicitly.
      </p>
      <p>
        <a href="/admin/merge">Inspect another property pair</a>
      </p>
      {!(data as Duplicate[]).length && <p>No candidates yet.</p>}
      {(data as Duplicate[]).map((d) => (
        <DuplicateCard key={d.id} d={d} />
      ))}
    </AccountShell>
  );
}
