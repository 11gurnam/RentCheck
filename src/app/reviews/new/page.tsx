import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { getProperty } from "@/features/discovery/data";
import { ReviewForm } from "@/features/reviews/forms";
import { z } from "zod";
export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  await requireUser("/reviews/new");
  const { property } = await searchParams;
  const p =
    property && z.uuid().safeParse(property).success
      ? await getProperty(property)
      : null;
  return (
    <AccountShell>
      <section className="dashboard-card">
        <h1>Share your tenancy experience</h1>
        {p ? (
          <ReviewForm property={p} />
        ) : (
          <p>
            <a href="/search">Find a property</a>, open its profile and choose
            Write a review.
          </p>
        )}
      </section>
    </AccountShell>
  );
}
