import { AccountShell } from "@/components/ui/account-shell";
import { isAdministrator, requireUser } from "@/lib/auth/session";

export default async function AdminPage() {
  await requireUser("/admin");
  const permitted = await isAdministrator();
  return (
    <AccountShell>
      <section className="dashboard-card boundary-card">
        <p className="eyebrow">ADMINISTRATOR AREA</p>
        <h1>
          {permitted ? "Administrator access verified." : "Access restricted."}
        </h1>
        <p>
          {permitted
            ? "Your account has administrator access. Demonstration verification and audit tools are ready."
            : "This account does not have administrator access. A public alias or account setting cannot grant it."}
        </p>
        {permitted && (
          <p>
            <a href="/admin/verification">Verification requests</a> ·{" "}
            <a href="/admin/audit">Audit records</a>
            {" · "}
            <a href="/admin/claims">Profile claims</a>
            {" · "}
            <a href="/admin/reports">Review reports</a>
            {" · "}
            <a href="/admin/duplicates">Possible duplicates</a>
            {" · "}
            <a href="/admin/associations">Management history</a>
          </p>
        )}
        <a className="primary-link" href="/account">
          Back to your account
        </a>
      </section>
    </AccountShell>
  );
}
