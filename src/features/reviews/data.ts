import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import type { OwnReview } from "./validation";
import type { CriterionRating } from "./criteria";
export async function ownReviews(): Promise<OwnReview[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_my_reviews");
  if (error) throw new Error("Reviews unavailable");
  return data;
}
export type FeedReview = {
  criteria: CriterionRating[];
  id: string;
  property_id: string;
  landlord_id: string | null;
  alias: string;
  body: string;
  property_rating: number;
  landlord_rating: number | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  rent_paid: number;
  was_edited: boolean;
};
export async function reviewFeed(
  property?: string,
  landlord?: string,
  page = 1,
): Promise<{ rows: FeedReview[]; total: number }> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_review_page", {
    p_property: property ?? null,
    p_landlord: landlord ?? null,
    p_page: page,
  });
  if (error) throw new Error("Reviews unavailable");
  return data;
}
