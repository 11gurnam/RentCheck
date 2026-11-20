import { describe, expect, it } from "vitest";
import { voiceQuery } from "./voice-query";

const catalogue = [
  { city: "Jaipur", state: "Rajasthan", locality: "Malviya Nagar" },
  { city: "Mumbai", state: "Maharashtra", locality: "Bandra" },
  { city: "Bengaluru", state: "Karnataka", locality: "Koramangala" },
  { city: "New Delhi", state: "Delhi", locality: "Saket" },
];
const empty = { city: "", state: "", locality: "" };

describe("voice query", () => {
  it.each([
    ["Find properties in Jaipur.", { q: "Jaipur", city: "Jaipur" }],
    ["Show me rental properties in Delhi.", { q: "New Delhi", city: "New Delhi" }],
    ["Find properties in Jaipur, Rajasthan.", { q: "Jaipur", city: "Jaipur", state: "Rajasthan" }],
    ["Search for properties in Mumbai.", { q: "Mumbai", city: "Mumbai" }],
    ["Find flats for rent in Mumbai.", { q: "Mumbai", city: "Mumbai", type: "Flat" }],
    ["Show me properties in Bangalore with good water supply.", { q: "Bengaluru", city: "Bengaluru" }],
    ["Find a PG in Koramangala, Bangalore.", { q: "Koramangala", city: "Bengaluru", locality: "Koramangala", type: "PG" }],
    ["Find Taj Hotel in Mumbai.", { q: "Taj Hotel", city: "Mumbai" }],
    ["Find properties in Rajasthan.", { q: "", state: "Rajasthan" }],
    ["Find a hostel.", { q: "", type: "Hostel" }],
    ["Find properties in Atlantis.", { q: "Find properties in Atlantis" }],
    ["Find properties in Mumbai, Rajasthan.", { q: "Find properties in Mumbai, Rajasthan" }],
    ["Find properties in Mumbai or Jaipur.", { q: "Find properties in Mumbai or Jaipur" }],
    ["Find properties in Atlantis, Rajasthan.", { q: "atlantis", state: "Rajasthan" }],
  ] as const)("interprets %s", (spoken, expected) => {
    expect(voiceQuery(spoken, catalogue, empty)).toEqual(expected);
  });

  it("keeps compatible filters and clears only incompatible locations", () => {
    expect(voiceQuery("Jaipur", catalogue, catalogue[0])).toEqual({ q: "Jaipur", city: "Jaipur" });
    expect(voiceQuery("Mumbai", catalogue, catalogue[0])).toEqual({ q: "Mumbai", city: "Mumbai", state: "", locality: "" });
  });

  it("keeps long fallback queries within the existing input limit", () => {
    expect(voiceQuery("unknown destination ".repeat(12), catalogue, empty).q).toHaveLength(120);
  });
});
