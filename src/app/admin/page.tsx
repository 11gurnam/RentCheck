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
            ? "Your account has administrator access. Verification, claims and moderation tools arrive in their planned phases."
            : "This account does not have administrator access. A public alias or account setting cannot grant it."}
        </p>
        <a className="primary-link" href="/account">
          Back to your account
        </a>
      </section>
    </AccountShell>
  );
}
