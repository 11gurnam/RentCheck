import { describe, it, expect } from "vitest";
import { parseFilters, searchHref, money } from "./filters";
describe("search filters", () => {
  it("defaults blank rent inputs, normalizes query and stores combined filters in URL", () => {
    const f = parseFilters({
      q: "  Neem  ",
      min: "",
      max: "",
      city: "New Delhi",
      type: "Flat",
    });
    expect(f.success).toBe(true);
    if (f.success) {
      expect(f.data.max).toBe(10000000);
      expect(searchHref(f.data, 2)).toContain("city=New+Delhi");
      expect(f.data.q).toBe("Neem");
    }
  });
  it.each([
    { min: "-1" },
    { min: "200", max: "100" },
    { type: "Hotel" },
    { page: "0" },
    { locality: "Central Park" },
    { q: "x".repeat(121) },
    { min: "NaN" },
  ])("rejects invalid filters %o", (v) =>
    expect(parseFilters(v).success).toBe(false),
  );
  it("accepts city-qualified locality and exact budget boundaries", () =>
    expect(
      parseFilters({
        city: "Jaipur",
        locality: "Central Park",
        min: "0",
        max: "10000000",
      }).success,
    ).toBe(true));
  it("uses Indian currency grouping", () =>
    expect(money(120000)).toContain("1,20,000"));
});
