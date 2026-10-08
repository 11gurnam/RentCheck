import { CollectionHeading } from "@/components/ui/collection-heading";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { myClaims } from "@/features/claims/data";
import { DetailsForm } from "@/features/claims/forms";
import { getProperty, getLandlord } from "@/features/discovery/data";
export default async function ClaimsPage() {
  await requireUser("/claims");
  const rows = await myClaims();
  return (
    <AccountShell>
      <CollectionHeading kind="claims" eyebrow="YOUR REPRESENTATIVE SPACE" title="Your demonstration claims" description="Keep track of the profiles you represent and your claim decisions." />
      <p>
        <a href="/search">Find a profile to claim</a>
      </p>
      {!rows.length && <p>No claims yet.</p>}
      {await Promise.all(
        rows.map(async (c) => {
          const profile = c.property_id
            ? await getProperty(c.property_id)
            : await getLandlord(c.landlord_id!);
          return (
            <section key={c.id} className="dashboard-card">
              <h2>{c.name}</h2>
              <p>
                {c.status} · {c.reason}
              </p>
              <a href={"/api/documents/" + c.document_id}>
                Download your private claim evidence
              </a>
              {c.status === "approved" && profile && (
                <DetailsForm claim={c} profile={profile} />
              )}
            </section>
          );
        }),
      )}
    </AccountShell>
  );
}
