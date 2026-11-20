import { describe, expect, it } from "vitest";
import { hasBudgetAmount, readBudget } from "./budget-request";

describe("rental budget requests", () => {
  it.each([
    ["show places undeer 3000", 3000],
    ["places udner ₹3,000", 3000],
    ["bellow 3k per month", 3000],
    ["under 6k or 7k", 7000],
  ])("keeps the intended cap in %s", (message, max) => {
    expect(readBudget(message, false)).toEqual({ max });
  });

  it("separates a rent range from unrelated numbers", () => {
    expect(readBudget("between ₹3 and 6k", false)).toEqual({ min: 3000, max: 6000 });
    expect(readBudget("at least 4 stars", true)).toEqual({});
    expect(hasBudgetAmount("show places blargh 3000")).toBe(true);
    expect(hasBudgetAmount("show House No 3000")).toBe(false);
    expect(hasBudgetAmount("show rooms for ₹3,000")).toBe(true);
  });

  it("uses the new value when the current rent is mentioned too", () => {
    expect(readBudget("Change the budget from 5k to 3k", true)).toEqual({ max: 3000 });
    expect(readBudget("Change minimum rent to 3k", true)).toEqual({ min: 3000 });
  });
});
