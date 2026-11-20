import { AccountShell } from "@/components/ui/account-shell";
import { ActionIcon } from "@/components/ui/action-feedback";
import { CollectionHeading } from "@/components/ui/collection-heading";
import { ClaimCard } from "@/features/claims/claim-card";
import { myClaims } from "@/features/claims/data";
import { ClaimForm, DetailsForm } from "@/features/claims/forms";
import { getLandlord, getProperty } from "@/features/discovery/data";
import { requireUser } from "@/lib/auth/session";

export default async function ClaimsPage() {
  await requireUser("/claims");
  const claims = await myClaims();
  const cards = await Promise.all(claims.map(async (claim) => {
    const profile = claim.status === "approved"
      ? claim.property_id
        ? await getProperty(claim.property_id)
        : await getLandlord(claim.landlord_id!)
      : null;
    const requested = claim.stage === "awaiting_information" && claim.property_id;

    return (
      <ClaimCard
        key={claim.id}
        claim={claim}
        editor={profile && <DetailsForm claim={claim} profile={profile} />}
        informationForm={requested ? (
          <ClaimForm target={requested} kind="property" name={claim.name} real={claim.is_demo === false} />
        ) : null}
      />
    );
  }));

  return (
    <AccountShell>
      <CollectionHeading kind="claims" eyebrow="YOUR REPRESENTATIVE SPACE" title="Your profile claims" description="Keep track of the profiles you represent and your claim decisions." />
      <div className="claims-list-toolbar">
        <p>{claims.length === 0 ? "No claims yet." : `${claims.length} ${claims.length === 1 ? "claim" : "claims"}`}</p>
        <a className="button" href="/claims/new"><ActionIcon name="search" />Find and claim your property</a>
      </div>
      <div className="claims-list">{cards}</div>
    </AccountShell>
  );
}
