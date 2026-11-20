import { expect, it } from "vitest";
import { cityMapPoint, resolveMapPoint } from "./city-map-point";

it("matches a city within its state and recognizes alternate city names", () => {
  expect(cityMapPoint(" Jaipur ", "Rajasthan")).toMatchObject({ precision: "city" });
  expect(cityMapPoint("Jaipur", "Maharashtra")).toBeNull();
  const bengaluru = cityMapPoint("Bengaluru", "Karnataka");
  expect(bengaluru).not.toBeNull();
  expect(cityMapPoint("Bangalore", "Karnataka")).toEqual(bengaluru);
});

it("prefers a shared pin and leaves an unknown city unpinned", () => {
  const shared = { latitude: 26.92, longitude: 75.82, precision: "approximate" };
  expect(resolveMapPoint({ city: "Jaipur", state: "Rajasthan", ...shared })).toEqual(shared);
  expect(resolveMapPoint({ city: "Browser city", state: "Delhi" })).toBeNull();
});
