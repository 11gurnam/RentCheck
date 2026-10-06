import { it, expect } from "vitest";
import { detailsSchema, replySchema } from "./validation";
const claim = "60000000-0000-4000-8000-000000000001";
const v = {
  claim,
  name: "Fictional profile",
  description: "Synthetic details",
  min: 1000,
  max: 2000,
  reason: "Fictional audited detail update",
};
it("allowlists claimant details and rejects privilege/rating injection", () => {
  expect(detailsSchema.safeParse(v).success).toBe(true);
  for (const patch of [
    { role: "admin" },
    { status: "approved" },
    { property_rating: 5 },
    { address: "Moved secretly" },
    { max: 500 },
    { reason: "tiny" },
  ])
    expect(detailsSchema.safeParse({ ...v, ...patch }).success).toBe(false);
});
it("replies use separate bounded text and valid claim/review references", () => {
  expect(
    replySchema.safeParse({
      claim,
      review: claim,
      body: "Fictional claimant reply text.",
    }).success,
  ).toBe(true);
  expect(
    replySchema.safeParse({ claim, review: claim, body: "tiny" }).success,
  ).toBe(false);
});
