import { CollectionHeading } from "@/components/ui/collection-heading";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { getProperty } from "@/features/discovery/data";
import { PropertyCard } from "@/features/discovery/cards";
import { SaveForm } from "@/features/contributions/forms";
export default async function SavedPage() {
  await requireUser("/saved");
  const db = await createDatabaseClient();
  const { data, error } = await db.rpc("get_saved_properties");
  if (error)
    return (
      <AccountShell>
        <h1>Your shortlist.</h1>
        <p role="alert">We couldn’t load your saved places. Please refresh.</p>
      </AccountShell>
    );
  const rows = await Promise.all(
    (data as { property_id: string }[]).map((r) => getProperty(r.property_id)),
  );
  return (
    <AccountShell>
      <CollectionHeading kind="saved" eyebrow="YOUR PRIVATE SHORTLIST" title="Places to come back to." description="Your saved places stay with your account. Only you can see or change your shortlist." />
      {rows.length ? (
        <div className="property-grid">
          {rows.map(
            (p) =>
              p && (
                <div key={p.id}>
                  <PropertyCard property={p} />
                  <SaveForm property={p.id} saved={true} />
                </div>
              ),
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No places saved yet.</p>
          <a href="/search">Explore accommodation</a>
        </div>
      )}
    </AccountShell>
  );
}
