// Generate city centres from the extracted GeoNames cities1000.txt (CC BY 4.0).
import { readFileSync, writeFileSync } from "node:fs";

const [file] = process.argv.slice(2);
if (!file) throw new Error("Provide the extracted GeoNames cities1000.txt path.");
const source = readFileSync(file, "utf8");
const cities = new Map();
for (const line of source.split("\n")) {
  const [, name, ascii, , latitude, longitude, , , country, , state, , , , population] = line.split("\t");
  if (country !== "IN" || !state) continue;
  for (const label of new Set([name, ascii])) {
    const key = `${state}:${label.trim().toLowerCase()}`;
    const previous = cities.get(key);
    if (!previous || previous.population < Number(population))
      cities.set(key, { population: Number(population), point: [Number(latitude), Number(longitude)] });
  }
}
if (!cities.has("24:jaipur") || cities.size < 1000) throw new Error("Incomplete India city data.");
const points = [...cities].map(([key, value]) => [key, value.point]);
points.sort(([a], [b]) => a.localeCompare(b, "en"));
writeFileSync("src/features/addresses/india-city-pins.json", JSON.stringify(Object.fromEntries(points)) + "\n");
