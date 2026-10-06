import { notFound } from "next/navigation";
import { z } from "zod";
import { AccountShell } from "@/components/ui/account-shell";
import {
  getProperty,
  getAssociations,
  getLandlord,
} from "@/features/discovery/data";
import { money } from "@/features/discovery/filters";
import { getVerifiedUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { SaveForm } from "@/features/contributions/forms";
import { ReviewFeed } from "@/features/reviews/feed";
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const p = await getProperty(id);
  if (!p) notFound();
  const user = await getVerifiedUser();
  const saved = user
    ? await (await createDatabaseClient()).rpc("get_saved_properties")
    : null;
  const isSaved = !!saved?.data?.some(
    (row: { property_id: string }) => row.property_id === id,
  );
  const associations = await getAssociations(id);
  const history = await Promise.all(
    associations.map(async (a) => ({
      ...a,
      landlord: await getLandlord(a.landlord_id),
    })),
  );
  return (
    <AccountShell>
      <a href="/search" className="text-link">
        ← Explore accommodation
      </a>
      <div className="profile-hero">
        <p className="eyebrow">
          {p.property_type} · {p.city}, {p.state}
        </p>
        <h1>{p.name}</h1>
        <p>{p.address}</p>
        <p className="rent">
          {money(p.rent_min)}–{money(p.rent_max)} / month
        </p>
        {p.is_demo && (
          <span className="demo-tag">
            Synthetic example · not a rental offer
          </span>
        )}
      </div>
      <SaveForm property={id} saved={isSaved} />
      <p>
        <a className="primary-link" href={`/reviews/new?property=${id}`}>
          Write a review
        </a>
      </p>
      <div className="dashboard-grid">
        <section className="dashboard-card">
          <h2>About this place</h2>
          <p>{p.description}</p>
          <h3>Current manager</h3>
          {p.landlord_id ? (
            <a href={`/landlords/${p.landlord_id}`}>{p.landlord_name}</a>
          ) : (
            <p>Manager not recorded</p>
          )}
        </section>
        <section className="dashboard-card">
          <h2>Reading tenant feedback</h2>

          <p className="field-hint">
            Property and management ratings remain separate.
          </p>
          <p>
            No eligible women’s recommendation responses yet. Tenant
            recommendations are never a safety guarantee.
          </p>
        </section>
      </div>
      <ReviewFeed property={id} />
      <section className="history-panel">
        <h2>Management history</h2>
        <p>
          Dates preserve who managed the place during a tenancy. End dates are
          exclusive.
        </p>
        {history.length ? (
          <ul>
            {history.map((a) => (
              <li key={a.id}>
                <a href={`/landlords/${a.landlord_id}`}>{a.landlord?.name}</a>
                <span>
                  {a.start_date} → {a.end_date ?? "Ongoing"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No management association recorded.</p>
        )}
      </section>
    </AccountShell>
  );
}
