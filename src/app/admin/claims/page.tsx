import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { adminClaims } from "@/features/claims/data";
import { ClaimDecision } from "@/features/claims/forms";
export default async function ClaimsAdmin() {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return (
      <AccountShell>
        <h1>Access restricted.</h1>
      </AccountShell>
    );
  const rows = await adminClaims();
  return (
    <AccountShell>
      <h1>Demonstration profile claims</h1>
      <p>
        Inspect private fictional evidence. Resolve existing claimant
        tenant-review or representative conflicts explicitly before approval.
        Every decision is audited.
      </p>
      {!rows.length && <p>No claims yet.</p>}
      {rows.map((c) => (
        <ClaimDecision key={c.id} claim={c} />
      ))}
    </AccountShell>
  );
}
