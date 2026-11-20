import points from "./india-city-pins.json";
import { canonicalCity, canonicalState, indianStates } from "./india";

const cityPoints: Record<string, number[]> = points;
const equivalentNames = [
  ["bengaluru", "bangalore"], ["mumbai", "bombay"], ["chennai", "madras"],
  ["kolkata", "calcutta"], ["gurugram", "gurgaon"], ["kochi", "cochin"],
  ["mysuru", "mysore"], ["pune", "poona"],
];

export function cityMapPoint(city: string, state: string) {
  const regionName = canonicalState(state.trim());
  const code = indianStates.find(region => region.name === regionName)?.code;
  if (!code || !city.trim()) return null;
  const cityName = canonicalCity(city, regionName).toLowerCase();
  const candidates = [cityName, ...(equivalentNames.find(names => names.includes(cityName)) ?? [])];
  for (const candidate of candidates) {
    const point = cityPoints[`${code}:${candidate}`];
    if (point) return { latitude: point[0], longitude: point[1], precision: "city" as const };
  }
  return null;
}

export function resolveMapPoint(place: { city: string; state: string; latitude?: number | null; longitude?: number | null; precision?: string | null }) {
  const { latitude, longitude, precision } = place;
  return latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude, precision: precision ?? "" }
    : cityMapPoint(place.city, place.state);
}
