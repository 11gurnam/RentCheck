import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import type { OwnReview } from "./validation";
export async function ownReviews(): Promise<OwnReview[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_my_reviews");
  if (error) throw new Error("Reviews unavailable");
  return data;
}
export type FeedReview = {
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
): Promise<FeedReview[]> {
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_review_feed", {
    p_property: property ?? null,
    p_landlord: landlord ?? null,
  });
  if (error) throw new Error("Reviews unavailable");
  return data;
}
