import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { adminVerifications } from "@/features/verification/data";
import { VerificationDecision } from "@/features/verification/forms";
export default async function VerificationAdmin() {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return (
      <AccountShell>
        <h1>Access restricted.</h1>
        <p>Administrator access required.</p>
      </AccountShell>
    );
  const rows = await adminVerifications();
  return (
    <AccountShell>
      <h1>Tenancy verification requests</h1>
      <p>
        Inspect the evidence and its demonstration/real label. Real approvals require the manual checklist. Every approval, rejection and
        revocation needs a reason and is audited.
      </p>
      {!rows.length && <p>No requests yet.</p>}
      {rows.map((r) => (
        <VerificationDecision key={r.id} request={r} />
      ))}
    </AccountShell>
  );
}
