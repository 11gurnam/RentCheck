export type CriterionRating = { key: string; label: string; rating: number; custom?: boolean };
export const basicCriteria = [
  { key: "water", label: "Water supply" },
  { key: "electricity", label: "Electricity availability" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "maintenance", label: "Maintenance" },
  { key: "security", label: "Security & access" },
];
const typeCriteria: Record<string, { key: string; label: string }[]> = {
  Flat: [{ key: "ventilation", label: "Light & ventilation" }, { key: "building", label: "Building facilities" }],
  House: [{ key: "ventilation", label: "Light & ventilation" }, { key: "space", label: "Living space" }],
  PG: [{ key: "food", label: "Food & kitchen facilities" }, { key: "wifi", label: "Wi-Fi / internet" }, { key: "bathrooms", label: "Shared bathrooms" }],
  Hostel: [{ key: "wifi", label: "Wi-Fi / internet" }, { key: "bathrooms", label: "Shared bathrooms" }, { key: "shared_spaces", label: "Shared spaces" }],
  Homestay: [{ key: "hospitality", label: "Host hospitality" }, { key: "food", label: "Food & kitchen facilities" }, { key: "wifi", label: "Wi-Fi / internet" }],
};
export function criteriaFor(type: string) { return [...basicCriteria, ...(typeCriteria[type] ?? [])]; }
export function overallRating(criteria: CriterionRating[]) {
  return criteria.length ? Math.round(criteria.reduce((sum, c) => sum + c.rating, 0) / criteria.length * 100) / 100 : null;
}
