import { it, expect } from "vitest";
import { mergeSchema, associationSchema, reportSchema } from "./validation";
const id = "70000000-0000-4000-8000-000000000001",
  other = "70000000-0000-4000-8000-000000000002";
it("requires explicit distinct merge targets, choices, resolutions and reason", () => {
  const v = {
    source: id,
    target: other,
    archive: [],
    revoke: [],
    history: "target",
    details: "target",
    reason: "Synthetic reviewed merge decision",
    confirm: "on",
  };
  expect(mergeSchema.safeParse(v).success).toBe(true);
  for (const p of [
    { target: id },
    { history: "" },
    { confirm: "" },
    { reason: "tiny" },
    { archive: ["not-id"] },
  ])
    expect(mergeSchema.safeParse({ ...v, ...p }).success).toBe(false);
});
it("validates report reasons and exclusive management dates", () => {
  expect(
    reportSchema.safeParse({
      review: id,
      reason: "Fictional concern for investigation",
    }).success,
  ).toBe(true);
  expect(reportSchema.safeParse({ review: id, reason: "tiny" }).success).toBe(
    false,
  );
  const v = {
    property: id,
    landlord: other,
    start: "2025-01-01",
    end: "2025-01-01",
    replace: "",
    reason: "Synthetic management history update",
  };
  expect(associationSchema.safeParse(v).success).toBe(false);
  expect(associationSchema.safeParse({ ...v, end: "" }).success).toBe(true);
});
