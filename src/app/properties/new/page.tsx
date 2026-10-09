import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { ContributionForm } from "@/features/contributions/forms";
import { operationMode } from "@/features/operations/data";
export default async function AddPropertyPage() {
  await requireUser("/properties/new");
  const mode = await operationMode();
  const real = mode.accepts_real_data;
  if (!real && mode.allows_demo_data === false) return <AccountShell><h1>Property contributions are not open yet.</h1><p>We’re preparing the service for genuine property details. Please check back soon.</p><a href="/search">Explore accommodation</a></AccountShell>;
  return (
    <AccountShell>
      <a href="/search">← Explore accommodation</a>
      <div className="discovery-heading">
        <p className="eyebrow">CONTRIBUTE TO RENTCHECK</p>
        <h1>Add a place to research.</h1>
        <p>
          {real ? "Contribute accurate property details. Do not include personal contact information or private documents in public descriptions." : "Use fictional demo details only."} We’ll show likely existing profiles before adding a distinct place. Contributions grant no management permissions.
        </p>
      </div>
      <ContributionForm real={real} />
    </AccountShell>
  );
}
