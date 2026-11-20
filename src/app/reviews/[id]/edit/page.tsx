import { notFound } from "next/navigation";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { ownReviews } from "@/features/reviews/data";
import { ReviewForm } from "@/features/reviews/forms";
import { VerificationForm } from "@/features/verification/forms";
import { myVerifications } from "@/features/verification/data";
import { PhotoForm } from "@/features/reviews/photo-form";
import { createDatabaseClient } from "@/lib/database/server";
import { myWomenProgram } from "@/features/women-program/data";
import { WomenProgramFeedback } from "@/features/women-program/forms";
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
  const db = await createDatabaseClient();
  const [{ data, error }, verifications, program] = await Promise.all([
    db.rpc("get_review_photos", { p_review: id }), myVerifications(), myWomenProgram(id),
  ]);
  if (error) throw new Error("Photos unavailable");
  const requests = verifications.filter(v => v.review_id === id);
  const association = requests.find(v => v.status === "approved" || v.status === "pending")?.status ??
    requests[0]?.status ?? "Not verified";
  return (
    <AccountShell>
      <div className="review-editor-layout">
      <section className="dashboard-card review-form-card">
        <h1>Edit your review</h1>
        <ReviewForm
          property={{ id: r.property_id, name: r.property_name, property_type: r.property_type, is_demo: r.is_demo }}
          review={r}
          existingPhotoCount={data?.length ?? 0}
        />
      </section>
      <PhotoForm review={id} photos={data} real={r.is_demo === false} allowUpload={false} />
      <VerificationForm
        review={id}
        real={r.is_demo === false}
        requests={requests}
      />
      {!r.archived && <WomenProgramFeedback key={program?.feedback ? "saved" : "new"} review={id}
        preferences={program} association={association} demo={r.is_demo !== false}/>}
      </div>
    </AccountShell>
  );
}
