import { notFound } from "next/navigation";
import { z } from "zod";
import { AccountShell } from "@/components/ui/account-shell";
import { ReviewFeed } from "@/features/reviews/feed";
import {
  getLandlord,
  getAssociations,
  getProperty,
} from "@/features/discovery/data";
export default async function LandlordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const l = await getLandlord(id);
  if (!l) notFound();
  const rows = await getAssociations(undefined, id);
  const properties = await Promise.all(
    rows.map(async (a) => ({
      ...a,
      property: await getProperty(a.property_id),
    })),
  );
  return (
    <AccountShell>
      <a href="/search">← Explore accommodation</a>
      <div className="profile-hero">
        <p className="eyebrow">MANAGEMENT PROFILE</p>
        <h1>{l.name}</h1>
        <p>{l.description}</p>
        <span className="demo-tag">Synthetic manager</span>
      </div>
      <p>
        <a href={`/claims/new?kind=landlord&target=${id}`}>
          Claim this profile
        </a>
      </p>
      <section className="dashboard-card">
        <h2>Management experiences</h2>
        <p>
          Management ratings stay with the manager responsible for the reviewed
          tenancy, even after a place changes hands.
        </p>
      </section>
      <ReviewFeed landlord={id} />
      <section className="history-panel">
        <h2>Associated accommodation</h2>
        <ul>
          {properties.map((a) => (
            <li key={a.id}>
              <div>
                <a href={`/properties/${a.property_id}`}>{a.property?.name}</a>
                <p>{a.property?.city}</p>
              </div>
              <span>
                {a.start_date} → {a.end_date ?? "Ongoing"}
              </span>
            </li>
          ))}
        </ul>
        {!properties.length && <p>No associated properties recorded.</p>}
      </section>
    </AccountShell>
  );
}
