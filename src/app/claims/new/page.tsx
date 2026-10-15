import { ClaimPropertySearch } from "@/features/claims/property-search";
import { findClaimProperties } from "@/features/claims/search-actions";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { getProperty, getLandlord } from "@/features/discovery/data";
import { ClaimForm } from "@/features/claims/forms";
import { z } from "zod";
import { myProfileClaim } from "@/features/claims/data";
import { PropertyClaimActions } from "@/features/claims/property-actions";
export default async function NewClaim({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; kind?: string }>;
}) {
  await requireUser("/claims");
  const v = z
    .object({ target: z.uuid(), kind: z.enum(["property", "landlord"]) })
    .safeParse(await searchParams);
  const profile = v.success
    ? v.data.kind === "property"
      ? await getProperty(v.data.target)
      : await getLandlord(v.data.target)
    : null;
  const existing=v.success?await myProfileClaim(v.data.target,v.data.kind):null;
  const active=existing&&["pending","approved","disputed"].includes(existing.status);
  return (
    <AccountShell>
      <section className="dashboard-card">
        <h1>{profile?.is_demo === false ? "Claim your property" : "Property claims"}</h1>
        {v.success && profile && active ? (
          <div className="existing-claim-notice"><h2>{profile.name}</h2><p>{existing.status==="approved"?"Your claim is approved. Manage your property from Your claims.":existing.status==="disputed"?"Your claim is under dispute. Review its status and any requested information in Your claims.":"Your claim has already been submitted. Follow its progress or provide requested information in Your claims."}</p>{v.data.kind==="property"?<div className="property-actions"><PropertyClaimActions property={v.data.target} claim={existing} owner/></div>:<a className="button" href={`/claims#claim-${existing.id}`}>View your claim</a>}</div>
        ) : v.success && profile ? (
          <ClaimForm
            target={v.data.target}
            kind={v.data.kind}
            name={profile.name}
            real={profile.is_demo === false}
          />
        ) : (
          <ClaimPropertySearch initialResult={await findClaimProperties("")} />
        )}
      </section>
    </AccountShell>
  );
}
