import { z } from "zod";
export const filtersSchema = z
  .object({
    q: z.string().trim().max(120).default(""),
    state: z.string().trim().max(80).default(""),
    city: z.string().trim().max(80).default(""),
    locality: z.string().trim().max(100).default(""),
    type: z.enum(["", "Flat", "House", "PG", "Hostel"]).default(""),
    min: z.coerce.number().int().min(0).max(10000000).default(0),
    max: z.coerce.number().int().min(0).max(10000000).default(10000000),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .refine((v) => v.max >= v.min, {
    message: "Maximum rent must be at least minimum rent.",
  })
  .refine((v) => !v.locality || !!v.city, {
    message: "Choose a city before choosing a locality.",
  });
export type Filters = z.infer<typeof filtersSchema>;
export function parseFilters(
  raw: Record<string, string | string[] | undefined>,
) {
  const input = Object.fromEntries(
    Object.entries(raw)
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      .filter(
        ([k, v]) => !(["min", "max", "page"].includes(k as string) && v === ""),
      ),
  );
  return filtersSchema.safeParse(input);
}
export function searchHref(filters: Filters, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, page }))
    if (
      v !== "" &&
      !(k === "min" && v === 0) &&
      !(k === "max" && v === 10000000) &&
      !(k === "page" && v === 1)
    )
      params.set(k, String(v));
  return `/search?${params}`;
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
