import { it, expect } from "vitest";
import { womenRecommended } from "./rules";
it.each([
  [0, 0, false],
  [2, 2, false],
  [3, 3, true],
  [3, 5, true],
  [3, 6, false],
  [3, 7, false],
  [4, 7, true],
])("threshold %i/%i => %s", (yes, total, expected) =>
  expect(womenRecommended(yes as number, total as number)).toBe(expected),
);
