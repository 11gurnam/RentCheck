import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";

export default async function NewReviewPage() {
  await requireUser("/reviews/new");
  return (
    <AccountShell>
      <section className="dashboard-card boundary-card">
        <p className="eyebrow">TENANT EXPERIENCES</p>
        <h1>Your perspective matters.</h1>
        <p>
          You’re signed in. Review writing will be available in Phase 4, after
          properties and tenancies are in place.
        </p>
        <a className="primary-link" href="/account">
          Back to your account
        </a>
      </section>
    </AccountShell>
  );
}
