import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { getProperty } from "@/features/discovery/data";
import { ReviewForm } from "@/features/reviews/forms";
import { z } from "zod";
import { createDatabaseClient } from "@/lib/database/server";
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
  if (p) {
    const { data, error } = await (
      await createDatabaseClient()
    ).rpc("can_review_property", { p_property: p.id });
    if (error) throw new Error("Review access unavailable");
    if (!data)
      return (
        <AccountShell>
          <h1>You cannot review your own property.</h1>
          <p>
            Use your approved representative controls to update permitted
            details or reply to tenant experiences.
          </p>
          <a href="/claims">Your claims</a>
        </AccountShell>
      );
  }
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
