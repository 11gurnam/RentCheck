import { notFound } from "next/navigation";
import { z } from "zod";
import { AccountShell } from "@/components/ui/account-shell";
import { ReviewFeed } from "@/features/reviews/feed";
import { reviewPage } from "@/features/reviews/pagination";
import {
  getLandlord,
  getAssociations,
  getProperty,
} from "@/features/discovery/data";
export default async function LandlordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviews?: string }>;
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
        <p className="eyebrow">LANDLORD / MANAGEMENT PROFILE</p>
        <h1>{l.name}</h1>
        <p>{l.description}</p>
        <span className="demo-tag">Synthetic manager</span>
      </div>
      <p>
        <a className="primary-link" href="#review-landlord">
          Review this landlord
        </a>
      </p>
      <p>
        <a href={`/claims/new?kind=landlord&target=${id}`}>
          Claim this profile
        </a>
      </p>
      <section className="dashboard-card" id="review-landlord">
        <h2>How to review this landlord</h2>
        <p>
          Choose the accommodation you rented from the list below, then rate
          Landlord / management in your tenancy review. Your tenancy dates
          determine which recorded landlord receives the management rating.
          Check the listed management period before submitting.
        </p>
        <p>
          Management ratings stay with the manager responsible for the reviewed
          tenancy, even after a place changes hands.
        </p>
      </section>
      <ReviewFeed
        landlord={id}
        page={reviewPage((await searchParams).reviews)}
      />
      <section className="history-panel">
        <h2>Associated accommodation</h2>
        <ul>
          {properties.map((a) => (
            <li key={a.id}>
              <div>
                <a href={`/properties/${a.property_id}`}>{a.property?.name}</a>
                <p>{a.property?.city}</p>
                {a.property && (
                  <a href={`/reviews/new?property=${a.property_id}`}>
                    Review your tenancy at {a.property.name}
                  </a>
                )}
              </div>
              <span>
                {a.start_date} → {a.end_date ?? "Ongoing"}
              </span>
            </li>
          ))}
        </ul>
        {!properties.length && (
          <p>
            No associated properties recorded. Find or add the place you rented;
            an administrator must record its management history before a review
            can be attributed to this landlord.
          </p>
        )}
      </section>
    </AccountShell>
  );
}
