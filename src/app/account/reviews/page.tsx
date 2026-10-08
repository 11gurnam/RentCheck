import { CollectionHeading } from "@/components/ui/collection-heading";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { ownReviews } from "@/features/reviews/data";
import { DeleteReview, CloseTenancy } from "@/features/reviews/forms";
export default async function MyReviews() {
  await requireUser("/account/reviews");
  const rows = await ownReviews();
  return (
    <AccountShell>
      <CollectionHeading kind="reviews" eyebrow="YOUR EXPERIENCES" title="Your reviews" description="Your experiences help others make a more informed move." />
      <p>
        <a href="/search">Find a place to review</a>
      </p>
      {!rows.length && <p>No reviews yet.</p>}
      {rows.map((r) => (
        <section key={r.id} className="dashboard-card">
          <h2>
            {r.archived ? (
              r.property_name
            ) : (
              <a href={"/properties/" + r.property_id}>{r.property_name}</a>
            )}
          </h2>
          <p>
            {r.status} · {r.start} → {r.end ?? "Current"}
          </p>
          <p>{r.body}</p>
          {r.status === "visible" ? (
            <>
              <a href={"/reviews/" + r.id + "/edit"}>Edit review and photos</a>
              <DeleteReview id={r.id} />
            </>
          ) : r.archived ? (
            <p>Archived duplicate tenancy retained for audit.</p>
          ) : (
            <CloseTenancy review={r} />
          )}
        </section>
      ))}
    </AccountShell>
  );
}
