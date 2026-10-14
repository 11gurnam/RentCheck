import { CollectionHeading } from "@/components/ui/collection-heading";
import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { ownReviews } from "@/features/reviews/data";
import { ReviewCollection } from "@/features/reviews/review-collection";
export default async function MyReviews() {
  await requireUser("/account/reviews");
  const rows = await ownReviews();
  return <AccountShell>
    <CollectionHeading kind="reviews" eyebrow="YOUR EXPERIENCES" title="Your reviews" description="Your experiences help others make a more informed move." />
    <ReviewCollection rows={rows} />
  </AccountShell>;
}
