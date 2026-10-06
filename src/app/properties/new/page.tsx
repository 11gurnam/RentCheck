import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { ContributionForm } from "@/features/contributions/forms";
export default async function AddPropertyPage() {
  await requireUser("/properties/new");
  return (
    <AccountShell>
      <a href="/search">← Explore accommodation</a>
      <div className="discovery-heading">
        <p className="eyebrow">CONTRIBUTE TO RENTCHECK</p>
        <h1>Add a place to research.</h1>
        <p>
          Use fictional demo details only. We’ll show likely existing profiles
          before adding a distinct place. Contributions grant no management
          permissions.
        </p>
      </div>
      <ContributionForm />
    </AccountShell>
  );
}
