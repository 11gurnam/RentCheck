import { it, expect } from "vitest";
import { reviewPage } from "./pagination";
it("normalizes URL pages without accepting noninteger or unsafe values", () => {
  for (const v of [
    undefined,
    "",
    "NaN",
    "1.2",
    "-3",
    "2e3",
    "900719925474099999",
  ])
    expect(reviewPage(v)).toBe(1);
  expect(reviewPage("2")).toBe(2);
  expect(reviewPage("0")).toBe(1);
  expect(reviewPage("999999")).toBe(10000);
});
