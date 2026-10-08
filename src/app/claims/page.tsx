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
      <h1>Your demonstration claims</h1>
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
              <p>
                <a
                  href={
                    c.property_id
                      ? "/properties/" + c.property_id
                      : "/landlords/" + c.landlord_id
                  }
                >
                  View profile and share property photos
                </a>
              </p>
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
