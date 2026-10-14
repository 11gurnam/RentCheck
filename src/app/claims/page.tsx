import { EvidenceLinks } from "@/features/privacy/evidence-upload";
import { ClaimForm } from "@/features/claims/forms";
import { CollectionHeading } from "@/components/ui/collection-heading";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { myClaims } from "@/features/claims/data";
import { DetailsForm } from "@/features/claims/forms";
import { getProperty, getLandlord } from "@/features/discovery/data";
import { StatusBadge } from "@/components/ui/action-feedback";
export default async function ClaimsPage() {
  await requireUser("/claims");
  const rows = await myClaims();
  return (
    <AccountShell>
      <CollectionHeading kind="claims" eyebrow="YOUR REPRESENTATIVE SPACE" title="Your profile claims" description="Keep track of the profiles you represent and your claim decisions." />
      <p>
        <a className="review-action" href="/claims/new">Find and claim your property</a>
      </p>
      {!rows.length && <p>No claims yet.</p>}
      {await Promise.all(
        rows.map(async (c) => {
          const profile = c.property_id
            ? await getProperty(c.property_id)
            : await getLandlord(c.landlord_id!);
          return (
            <section key={c.id} className="dashboard-card">
              <h2>{c.name}</h2><p>{c.address}</p>{c.status === "approved" && c.property_id && <p className="verified-response-label">{c.is_demo ? "Demonstration Landlord" : "Verified Landlord"} · this property only</p>}
              <p>
                {c.is_demo === false ? "Manual evidence review" : "Demonstration claim"} ·{" "}
                <StatusBadge status={c.status}>{c.stage === "awaiting_information" ? "Awaiting your information" : c.stage === "under_review" ? "Under review" : c.status}</StatusBadge> · {c.reason}
              </p>
              <EvidenceLinks documents={c.documents ?? []} />
              {c.stage === "awaiting_information" && c.property_id && <details open><summary>Provide requested information</summary><p>Submit a complete updated evidence set. Previous evidence stays private until its retention deadline.</p><ClaimForm target={c.property_id} kind="property" name={c.name} real={c.is_demo === false}/></details>}
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
