import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { getProperty, getLandlord } from "@/features/discovery/data";
import { ClaimForm } from "@/features/claims/forms";
import { z } from "zod";
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
  return (
    <AccountShell>
      <section className="dashboard-card">
        <h1>{profile?.is_demo === false ? "Claim a representative profile" : "Claim a demonstration profile"}</h1>
        {v.success && profile ? (
          <ClaimForm
            target={v.data.target}
            kind={v.data.kind}
            name={profile.name}
            real={profile.is_demo === false}
          />
        ) : (
          <p>
            <a href="/search">Find a profile</a> and choose Claim this profile.
          </p>
        )}
      </section>
    </AccountShell>
  );
}
