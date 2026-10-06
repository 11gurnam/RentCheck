import { notFound } from "next/navigation";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { ownReviews } from "@/features/reviews/data";
import { ReviewForm } from "@/features/reviews/forms";
import { PhotoForm } from "@/features/reviews/photo-form";
import { createDatabaseClient } from "@/lib/database/server";
export default async function EditReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser("/account/reviews");
  const { id } = await params;
  const r = (await ownReviews()).find(
    (x) => x.id === id && x.status === "visible",
  );
  if (!r) notFound();
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_review_photos", { p_review: id });
  if (error) throw new Error("Photos unavailable");
  return (
    <AccountShell>
      <section className="dashboard-card">
        <h1>Edit your review</h1>
        <ReviewForm
          property={{ id: r.property_id, name: r.property_name }}
          review={r}
        />
      </section>
      <PhotoForm review={id} photos={data} />
    </AccountShell>
  );
}
