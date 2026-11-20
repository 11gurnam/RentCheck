import { filtersSchema } from "@/features/discovery/filters";
import type { ClearableFilter, Intent } from "./schema";

export const defaultFilters = filtersSchema.parse({});
type FilterPatch = NonNullable<Intent["filters"]>;

const clearValues: Record<ClearableFilter, FilterPatch> = {
  location: { state: "", city: "", locality: "" },
  city: { city: "", locality: "" },
  state: { state: "", city: "", locality: "" },
  locality: { locality: "" },
  budget: { min: defaultFilters.min, max: defaultFilters.max },
  min: { min: defaultFilters.min },
  max: { max: defaultFilters.max },
  type: { type: "" },
  eligibility: { eligibility: [] },
  rating: { rating: 0 },
  women: { women: "" },
  verification: { verification: "" },
  q: { q: "" },
};

export function filterPatch(intent: Intent): FilterPatch {
  return { ...Object.assign({}, ...(intent.clear ?? []).map(key => clearValues[key])), ...intent.filters };
}

const removals: [ClearableFilter, RegExp][] = [
  ["location", /\b(?:(?:clear|remove|drop|ignore|forget) (?:the |my )?(?:location|city)(?: filter| restriction)?|(?:location|city) (?:doesn t|does not) matter|(?:don t|do not) (?:restrict|limit|filter)(?: (?:my |the )?search)? (?:by|to) (?:a |the )?(?:city|location))\b/],
  ["locality", /\b(?:clear|remove|drop|ignore) (?:the |my )?(?:locality|neighbou?rhood)(?: filter| restriction)?\b/],
  ["budget", /\b(?:(?:clear|remove|drop|ignore|forget) (?:the |my )?(?:budget|rent (?:limit|restriction|filter))|no (?:monthly )?(?:budget|rent) (?:limit|restriction)|any budget)\b/],
  ["max", /\b(?:clear|remove|drop) (?:the |my )?(?:maximum rent|max rent|upper rent limit)\b/],
  ["min", /\b(?:clear|remove|drop) (?:the |my )?(?:minimum rent|min rent|lower rent limit)\b/],
  ["type", /\b(?:all (?:property|accommodation) types|any (?:property|accommodation) type|(?:clear|remove|drop) (?:the )?(?:property|accommodation) type(?: filter)?)\b/],
  ["eligibility", /\b(?:any (?:tenant|renter) type|all tenant types|(?:clear|remove|drop) (?:the |my )?tenant (?:type|preferences?|filter|restrictions?))\b/],
  ["rating", /\b(?:any rating|no minimum rating|(?:clear|remove|drop) (?:the )?(?:minimum )?rating(?: filter| requirement)?)\b/],
  ["women", /\b(?:clear|remove|drop|ignore) (?:the )?women(?: s)? (?:tenant )?(?:recommendations?|ratings?)(?: filter)?\b/],
  ["verification", /\b(?:(?:clear|remove|drop) (?:the )?(?:verified tenant reviews|(?:tenant )?verification)(?: filter| requirement)?|any verification status)\b/],
  ["q", /\b(?:clear|remove|drop) (?:the )?(?:keyword|search text)(?: filter)?\b/],
];

export function requestedRemovals(text: string) {
  return removals.flatMap(([group, expression]) => expression.test(text) ? [group] : []);
}
