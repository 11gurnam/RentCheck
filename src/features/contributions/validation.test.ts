import { it, expect } from "vitest";
import { contributionSchema } from "./validation";
const valid = {
  name: "Fictional Test Place",
  address: "Demo Lane 555",
  state: "Delhi",
  city: "New Delhi",
  locality: "Demo Park",
  type: "Flat",
  min: "10000",
  max: "20000",
  description: "Synthetic example",
  synthetic: "on",
};
it("validates synthetic contribution and strips injected authority", () => {
  const result = contributionSchema.parse({
    ...valid,
    role: "admin",
    user_id: "forged",
  });
  expect(result.min).toBe(10000);
  expect(result).not.toHaveProperty("role");
});
it.each([
  { synthetic: undefined },
  { min: "-1" },
  { max: "9000" },
  { name: "<script>" },
  { address: "x" },
  { type: "Hotel" },
])("rejects contribution boundary %o", (override) =>
  expect(contributionSchema.safeParse({ ...valid, ...override }).success).toBe(
    false,
  ),
);
