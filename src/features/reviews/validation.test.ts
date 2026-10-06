import { it, expect } from "vitest";
import { reviewSchema } from "./validation";
const input = {
  property: "20000000-0000-4000-8000-000000000001",
  start: "2025-01-01",
  end: "",
  current: "true",
  paid: 15000,
  propertyRating: 4,
  managerRating: "",
  body: "Fictional review with enough text.",
  recommend: "",
  synthetic: "on",
};
it("validates fictional tenancy calendar dates, bounds and explicit answers", () => {
  expect(reviewSchema.safeParse(input).success).toBe(true);
  for (const patch of [
    { start: "2025-02-30" },
    { start: "2099-01-01" },
    { current: "false" },
    { end: "2025-02-01" },
    { paid: -1 },
    { propertyRating: 0 },
    { managerRating: 6 },
    { body: "Tiny" },
    { synthetic: undefined },
    { recommend: "inferred" },
  ])
    expect(reviewSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  expect(
    reviewSchema.safeParse({ ...input, current: "false", end: "2025-02-01" })
      .success,
  ).toBe(true);
});
