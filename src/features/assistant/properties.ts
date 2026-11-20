import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import { cityMapPoint } from "@/features/addresses/city-map-point";
import { canonicalState, indianStates } from "@/features/addresses/india";
import { propertySearchParameters, searchProperties } from "@/features/discovery/data";
import { filtersSchema, money, searchHref, type Filters } from "@/features/discovery/filters";
import { propertyInformation, type PropertyInformation } from "@/features/property-information/data";
import { rentalLabels } from "@/features/property-information/preferences";
import { areaTarget, isLikelyCityTypo, requestedArea } from "./area-request";
import { defaultFilters, filterPatch } from "./filter-update";
import { normalize } from "./knowledge";
import type { AssistantContext, AssistantProperty, AssistantReply, AssistantRequest, Intent } from "./schema";

export type Place = { state: string; city: string; locality: string };
type Coordinates = NonNullable<AssistantRequest["location"]>;
type PropertyDigest = { count: number; examples: number; average: number | null; rows: Omit<AssistantProperty, "womenRating" | "preferences" | "verified">[] };
const cityAliases: Record<string, string> = {
  bangalore: "bengaluru", bombay: "mumbai", delhi: "new delhi", gurgaon: "gurugram",
  calcutta: "kolkata", madras: "chennai", poona: "pune", cochin: "kochi",
};

function cityKey(value: string) {
  const key = normalize(value);
  return cityAliases[key] ?? key;
}

async function publicPlaces() {
  const db = await createDatabaseClient();
  const places: Place[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.rpc("get_assistant_locations")
      .order("state").order("city").order("locality").range(offset, offset + 999);
    if (error) throw new Error("Public locations unavailable");
    places.push(...data);
    if (data.length < 1000) return places;
  }
}

function contains(text: string, place: string) {
  return !!place && ` ${text} `.includes(` ${place} `);
}

function resolveArea(places: Place[], rawText: string, patch: NonNullable<Intent["filters"]>, previous: Filters) {
  if (patch.state === "" && patch.city === "" && patch.locality === "") {
    return { city: "", state: "", locality: "", ambiguousLocality: false, unknownArea: undefined };
  }

  const text = normalize(areaTarget(rawText).text);
  const phrase = requestedArea(rawText);
  const phraseKey = cityKey(phrase ?? "");
  const mentionedCities = new Set(Object.entries(cityAliases).filter(([alias]) => contains(text, alias)).map(([, key]) => key));
  const spokenState = indianStates.find(region => contains(text, normalize(region.name)) && region.name !== "Delhi")?.name ??
    (phraseKey === "new delhi" ? undefined : canonicalState(phrase ?? "") || undefined);
  const scopedPlaces = spokenState ? places.filter(place => place.state === spokenState) : places;
  const namedCities = scopedPlaces
    .filter(place => contains(text, normalize(place.city)) || mentionedCities.has(cityKey(place.city)))
    .sort((a, b) => Number(cityKey(b.city) === phraseKey) - Number(cityKey(a.city) === phraseKey) || b.city.length - a.city.length);
  const namedCity = namedCities[0];

  const typo = phrase ? cityKey(phrase) : previous.city && /^[\p{L}]{5,24}$/u.test(text) ? text : "";
  const namedLocality = (place: Place) => contains(text, normalize(place.locality));
  const corrections = !namedCity && typo && !scopedPlaces.some(namedLocality)
    ? [...new Map(scopedPlaces.filter(place => isLikelyCityTypo(cityKey(place.city), typo))
      .map(place => [`${place.state}|${place.city}`, place])).values()]
    : [];
  const referenceCities = !namedCity && !corrections.length && phraseKey && !scopedPlaces.some(namedLocality)
    ? indianStates.flatMap(region => {
      if (spokenState && region.name !== spokenState) return [];
      const city = region.cities.find(value => cityKey(value) === phraseKey);
      return city ? [{ state: region.name, city: phraseKey === "new delhi" ? "New Delhi" : city, locality: "" }] : [];
    })
    : [];
  const ambiguousCity = (namedCity && namedCities.some(place => cityKey(place.city) === cityKey(namedCity.city) && place.state !== namedCity.state)) ||
    corrections.length > 1 || referenceCities.length > 1;
  const spokenCity = namedCity ?? (corrections.length === 1 ? corrections[0] : referenceCities[0]);
  const state = spokenState ?? spokenCity?.state ?? patch.state;
  const modelCityKey = cityKey(patch.city ?? "");
  const modelCity = scopedPlaces.find(place => modelCityKey && cityKey(place.city) === modelCityKey &&
    (!state || normalize(place.state) === normalize(state)));
  const city = spokenCity?.city ?? modelCity?.city ?? patch.city;
  const matchedLocalities = scopedPlaces
    .filter(place => (!city || cityKey(place.city) === cityKey(city)) && namedLocality(place))
    .sort((a, b) => b.locality.length - a.locality.length);
  const priorLocalities = !city && !spokenState ? matchedLocalities.filter(place => place.city === previous.city && place.state === previous.state) : [];
  const foundLocality = priorLocalities.length ? priorLocalities : matchedLocalities;
  const identified = foundLocality[0];
  const uniqueLocality = identified && foundLocality.every(place => place.city === identified.city && place.state === identified.state);
  const resolvedCity = city ?? (uniqueLocality ? identified.city : spokenState ? "" : undefined);
  const resolvedState = spokenState ?? spokenCity?.state ?? (uniqueLocality ? identified.state : undefined) ?? modelCity?.state ?? state;
  const modelHasArea = modelCity && patch.locality && normalize(patch.locality) === normalize(phrase ?? "");
  const unknownArea = phrase && !ambiguousCity && !spokenState && !spokenCity && !identified && !modelHasArea ? phrase : undefined;

  return {
    city: unknownArea ? "" : resolvedCity,
    locality: unknownArea ? "" : uniqueLocality ? identified.locality : spokenCity || spokenState ? "" : patch.locality,
    state: unknownArea ? "" : resolvedState,
    ambiguousLocality: !!ambiguousCity || (!!identified && !uniqueLocality),
    unknownArea,
  };
}

export function nearestCity(places: Place[], point: Coordinates) {
  const cities = new Map(places.map(place => [`${place.state}|${place.city}`, place]));
  let nearest: Place | undefined;
  let best = 80;
  for (const city of cities.values()) {
    const center = cityMapPoint(city.city, city.state);
    if (!center) continue;
    const north = (point.latitude - center.latitude) * 111;
    const east = (point.longitude - center.longitude) * 111 * Math.cos(point.latitude * Math.PI / 180);
    const distance = Math.hypot(north, east);
    if (distance < best) {
      best = distance;
      nearest = city;
    }
  }
  return nearest;
}

function assistantProperty(property: PropertyDigest["rows"][number], details?: PropertyInformation): AssistantProperty {
  const { id, name, city, locality, rent_min, rent_max, is_demo, property_rating } = property;
  return {
    id, name, city, locality, rent_min, rent_max, is_demo, property_rating,
    womenRating: details?.women?.rating == null ? null : Number(details.women.rating),
    preferences: rentalLabels(details?.preferences ?? []),
    verified: (details?.verified_count ?? 0) > 0,
  };
}

async function queryProperties(filters: Filters, mode: AssistantContext["mode"], point?: Coordinates) {
  const db = await createDatabaseClient();
  const { data, error } = await db.rpc("get_assistant_properties", {
    ...propertySearchParameters(filters),
    p_mode: mode,
    p_latitude: point?.latitude ?? null, p_longitude: point?.longitude ?? null,
  });
  if (error || !data) throw new Error("Public property information unavailable");
  const digest = data as PropertyDigest;
  const information = digest.rows.length ? await propertyInformation(digest.rows.map(property => property.id)) : new Map();
  const properties = digest.rows.map(property => assistantProperty(property, information.get(property.id)));
  return { ...digest, properties };
}

export async function propertyReply(input: AssistantRequest, intent: Intent): Promise<AssistantReply> {
  const prior = intent.reset ? undefined : input.context;
  const base = prior?.filters ?? defaultFilters;
  const patch = filterPatch(intent);
  const clearedArea = patch.state === "" && patch.city === "" && patch.locality === "";
  const requestedMode = intent.mode ?? prior?.mode ?? "search";
  const mode = (requestedMode === "nearby" && clearedArea) || (requestedMode === "women_rating" && patch.women === "") ? "search" : requestedMode;
  const places = await publicPlaces();
  const point = input.location;
  const nearby = point && nearestCity(places, point);
  if (point && !nearby) {
    return { text: "I couldn’t match your location to a city in the RentCheck catalogue. Which city or locality should I search?", context: { filters: base, mode, needsCity: true } };
  }
  const area = nearby
    ? { city: nearby.city, state: nearby.state, locality: "", ambiguousLocality: false, unknownArea: undefined }
    : resolveArea(places, input.message ?? "", patch, base);
  const cityChanged = area.city !== undefined && area.city !== base.city;
  const stateChanged = area.state !== undefined && area.state !== base.state;
  const city = area.city ?? (stateChanged ? "" : base.city);
  const search = filtersSchema.safeParse({
    ...base, ...patch, city, state: area.state ?? (cityChanged ? "" : base.state),
    locality: city ? area.locality ?? (cityChanged || stateChanged ? "" : base.locality) : "",
    min: patch.min ?? base.min,
    max: patch.max ?? base.max,
    women: mode === "women_rating" ? patch.women || base.women || "reviews" : patch.women ?? base.women,
    eligibility: patch.eligibility ? [...new Set(patch.eligibility)] : base.eligibility,
    page: 1,
  });
  if (!search.success) {
    if ((patch.min ?? base.min) > (patch.max ?? base.max)) {
      return { text: "The minimum rent is higher than the maximum. What monthly rent range should I use?", context: prior };
    }
    return { text: "I couldn’t use those filters together. Try a valid monthly rent range or clarify which tenants the property should accept.", context: prior };
  }
  const filters = search.data;
  const context = { filters, mode };
  if (area.unknownArea) {
    return { text: `I couldn’t find “${area.unknownArea}” in the RentCheck catalogue. Which city should I search?`, context: { ...context, needsCity: true } };
  }
  if (mode === "nearby" && !point && (!filters.city || /\b(?:near me|around me|my location)\b/i.test(input.message ?? ""))) {
    return { text: "Share your approximate location or type a city or locality.", offerLocation: true, context: { ...context, needsCity: true } };
  }
  if (area.ambiguousLocality || (prior?.needsCity && !clearedArea && !filters.city && !filters.state)) {
    return { text: "Which city should I search? You can include the neighbourhood too.", context: { ...context, needsCity: true } };
  }
  if (!filters.city && (patch.locality || /\b(?:this|my|the) (?:locality|neighbourhood|neighborhood)\b/i.test(input.message ?? ""))) {
    return { text: "Which locality and city would you like me to check?", context: { ...context, needsCity: true } };
  }
  const location = [filters.locality, filters.city || filters.state].filter(Boolean).join(", ");
  const where = location ? ` in ${location}` : " on RentCheck";
  const href = searchHref(filters, 1).replace(/\?$/, "");
  const links = [{ label: "View properties", href }];
  const locationChanged = base.city !== filters.city || base.locality !== filters.locality || base.state !== filters.state;
  const clearedBudget = (base.min !== defaultFilters.min || base.max !== defaultFilters.max) &&
    filters.min === defaultFilters.min && filters.max === defaultFilters.max;
  const clearedLabels = [
    clearedBudget && "budget limit",
    base.type && !filters.type && "property type",
    base.eligibility.length > 0 && !filters.eligibility.length && "tenant preferences",
    base.women && !filters.women && "women’s recommendation filter",
    base.verification && !filters.verification && "verification filter",
    base.rating > 0 && !filters.rating && "minimum rating",
    base.locality && !filters.locality && base.city === filters.city && "neighbourhood filter",
  ].filter(Boolean).join(", ");
  const acknowledgement = intent.reset && mode === "search" ? "I’ve started a fresh search. " :
    clearedArea && (locationChanged || prior?.needsCity) ? "I’ll search across India. " :
    (base.city || base.state) && locationChanged && location ? `I’ve switched to ${location}. ` :
    clearedLabels ? `I’ve removed your ${clearedLabels}. ` : "";
  const [{ count, examples, average, properties }, alternatives] = await Promise.all([
    queryProperties(filters, mode, point),
    mode === "search" || mode === "nearby" ? searchProperties(filters, { nearBudget: true }).catch(() => []) : [],
  ]);
  const nearBudget = alternatives.length
    ? { limit: filters.max, properties: alternatives.map(property => assistantProperty(property, property.information)) }
    : undefined;
  if (!count) {
    const text = nearBudget
      ? `I found no matches${where} within your ${money(filters.max)} monthly limit. These places start a little above it.`
      : mode === "rating" || mode === "women_rating"
        ? `I found no properties with these ratings${where}. Try widening the area or changing your filters.`
        : `I found no matching properties${where}${filters.max < defaultFilters.max ? ` within your ${money(filters.max)} monthly limit` : ""}.`;
    return { text: acknowledgement + text, links, nearBudget, context, searchHref: href };
  }
  const countText = `${new Intl.NumberFormat("en-IN").format(count)} ${count === 1 ? "property" : "properties"}`;
  const demoText = examples ? ` This includes ${examples} demo ${examples === 1 ? "property" : "properties"}.` : "";
  if (mode === "count") return { text: `${acknowledgement}I found ${countText}${where}.${demoText}`, links, context, searchHref: href };
  if (mode === "average" && average != null) {
    return { text: `${acknowledgement}The average is ${money(average)} per month across ${countText}${where}, using the midpoint of each listed rent range.${demoText}`, links, context, searchHref: href };
  }
  const intro = mode === "rating" ? `Here are the highest-rated matches${where}.` :
    mode === "women_rating" ? `Here are the matches with the highest Women Tenant Ratings${where}.` :
    mode === "nearby" ? `Here are matches in the ${filters.city} area.` :
    `I found ${countText}${where}.`;
  const budget = filters.max < defaultFilters.max ? ` The listed rent ranges overlap your ${money(filters.max)} monthly limit.` :
    filters.min > 0 ? ` The listed rent ranges reach at least ${money(filters.min)} a month.` : "";
  return { text: `${acknowledgement}${intro}${budget}`, links, properties, nearBudget, context, searchHref: href };
}
