import { EvidenceLinks } from "@/features/privacy/evidence-upload";
import { ClaimForm } from "@/features/claims/forms";
import { CollectionHeading } from "@/components/ui/collection-heading";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { myClaims } from "@/features/claims/data";
import { DetailsForm } from "@/features/claims/forms";
import { getProperty, getLandlord } from "@/features/discovery/data";
import { StatusBadge, ActionIcon } from "@/components/ui/action-feedback";
export default async function ClaimsPage() {
  await requireUser("/claims");
  const rows = await myClaims();
  return (
    <AccountShell>
      <CollectionHeading kind="claims" eyebrow="YOUR REPRESENTATIVE SPACE" title="Your profile claims" description="Keep track of the profiles you represent and your claim decisions." />
      <p>
        <a className="button" href="/claims/new"><ActionIcon name="search"/>Find and claim your property</a>
      </p>
      {!rows.length && <p>No claims yet.</p>}
      {await Promise.all(
        rows.map(async (c) => {
          const profile = c.property_id
            ? await getProperty(c.property_id)
            : await getLandlord(c.landlord_id!);
          return (
            <section key={c.id} id={`claim-${c.id}`} className="dashboard-card claim-card">
              <header className="claim-card-heading"><div><small className="claim-kind">{c.is_demo === false ? "Property ownership / authority claim" : "Demonstration claim"}</small><h2>{c.name}</h2></div><StatusBadge status={c.status}>{c.stage === "awaiting_information" ? "Action needed" : c.stage === "under_review" ? "Under review" : c.status === "pending" ? "Awaiting review" : c.status.replaceAll("_"," ")}</StatusBadge></header>
              <div className="claim-address"><svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg><div><span>Property address</span><p>{c.address || "No property address available"}</p></div></div>
              {c.status === "approved" && c.property_id && <p className="verified-response-label">{c.is_demo ? "Demonstration Landlord" : "Verified Landlord"} · this property only</p>}
              {c.reason && <div className="claim-review-update"><strong>Review update</strong><p>{c.reason}</p></div>}
              <section className="claim-documents"><h3><ActionIcon name="shield"/>Private supporting documents</h3><p>Visible only to you and authorized reviewers.</p>{c.documents?.length ? <EvidenceLinks documents={c.documents} /> : <p>No supporting documents available.</p>}</section>
              {c.stage === "awaiting_information" && c.property_id && <details open><summary>Provide requested information</summary><p>Submit a complete updated evidence set. Previous evidence stays private until its retention deadline.</p><ClaimForm target={c.property_id} kind="property" name={c.name} real={c.is_demo === false}/></details>}
              <footer className="claim-card-actions">
                {c.property_id&&<a className="review-action" href="/account/contact"><ActionIcon name="edit"/>Contact settings</a>}
                <a
                  className="review-action"
                  href={
                    c.property_id
                      ? "/properties/" + c.property_id
                      : "/landlords/" + c.landlord_id
                  }
                >
                  <ActionIcon name="search"/>{c.property_id ? "View property" : "View landlord profile"}
                </a>
              </footer>
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
