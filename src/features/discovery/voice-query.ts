import { accommodationTypes, type Filters } from "./filters";

export type SearchLocation = Pick<Filters, "state" | "city" | "locality">;
type VoiceFilters = Partial<Pick<Filters, "state" | "city" | "locality" | "type">> & { q: string };

const cityNames = [
  ["bengaluru", "bangalore"], ["mumbai", "bombay"], ["chennai", "madras"],
  ["kolkata", "calcutta"], ["pune", "poona"], ["gurugram", "gurgaon"],
  ["delhi", "new delhi"], ["kochi", "cochin"], ["mysuru", "mysore"],
  ["thiruvananthapuram", "trivandrum"], ["varanasi", "banaras", "benares"],
];
const request = /^(?:please\s+)?(?:(?:find|show|search|look for|i need|i want|i am looking for|i'm looking for|can you find)(?:\s+(?:me|for))?\s+)/i;
const genericSubject = /^(?:(?:a|an|the|some|any|good|rent(?:als?)?|properties|property|places?|accommodation|to|for|lease|in|and)(?:\s+|$))*$/i;
const typePhrases: Record<(typeof accommodationTypes)[number], RegExp> = {
  Flat: /\b(?:flats?|apartments?)\b/,
  House: /\bhouses?\b/,
  PG: /\b(?:pgs?|p g|paying guests?)\b/,
  Hostel: /\bhostels?\b/,
  Homestay: /\b(?:homestays?|home stays?)\b/,
};

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const contains = (text: string, phrase: string) => !!phrase && ` ${text} `.includes(` ${phrase} `);
const unique = (values: string[]) => [...new Set(values)];
const removePhrases = (text: string, phrases: string[]) =>
  [...phrases].sort((a, b) => b.length - a.length)
    .reduce((remaining, phrase) => remaining.replaceAll(` ${phrase} `, " "), ` ${text} `).trim();

function locationMatch(text: string, options: string[], aliases: string[][] = []) {
  const matches = unique(options).flatMap(value => {
    const name = normalize(value);
    const variants = aliases.find(group => group.includes(name)) ?? [];
    // A spoken alias must not shadow an exact catalogue name.
    const phrases = [name, ...variants.filter(variant => !options.some(option => normalize(option) === variant))];
    return phrases.filter(phrase => contains(text, phrase)).map(phrase => ({ value, phrase }));
  });
  const strongest = matches.filter(match => !matches.some(other =>
    other.phrase !== match.phrase && contains(other.phrase, match.phrase)));
  const values = unique(strongest.map(match => match.value));
  return { value: values.length === 1 ? values[0] : undefined, ambiguous: values.length > 1,
    phrases: unique(strongest.map(match => match.phrase)) };
}

export function voiceQuery(transcript: string, locations: SearchLocation[], current: SearchLocation): VoiceFilters {
  const spoken = transcript.trim().replace(/[.!?]+$/, "").trim();
  const fallback = { q: spoken.slice(0, 120) };
  const content = spoken.replace(request, "").trim();
  const [main] = content.split(/\s+with\s+/i);
  const locationClause = /\s+\b(?:in|near|around|at|within)\s+/i.exec(main);
  const subject = locationClause ? main.slice(0, locationClause.index).trim() : "";
  const locationText = normalize(locationClause ? main.slice(locationClause.index + locationClause[0].length) : main);
  const allCities = locationMatch(locationText, locations.map(location => location.city), cityNames);
  const stateMatch = locationMatch(removePhrases(locationText, allCities.phrases), locations.map(location => location.state));
  const state = stateMatch.value;
  const matchingState = locations.filter(location => !state || location.state === state);
  const matchingCity = locationMatch(locationText, matchingState.map(location => location.city), cityNames);
  if (stateMatch.ambiguous || allCities.ambiguous || (state && allCities.value && !matchingCity.value)) return fallback;

  const city = matchingCity.value;
  const matchingLocations = matchingState.filter(location => !city || location.city === city);
  const placePhrases = [...stateMatch.phrases, ...matchingCity.phrases];
  const localityMatch = locationMatch(locationText, matchingLocations.map(location => location.locality)
    .filter(locality => !placePhrases.includes(normalize(locality))));
  if (localityMatch.ambiguous) return fallback;
  const locality = localityMatch.value;
  const localityRows = locality ? matchingLocations.filter(location => location.locality === locality) : [];
  const localityCities = unique(localityRows.map(location => location.city));
  const selectedCity = city ?? (localityCities.length === 1 ? localityCities[0] : undefined);
  const selectedLocality = selectedCity ? locality : undefined;
  const remainder = removePhrases(locationText, [...placePhrases, ...localityMatch.phrases]);
  const categoryText = normalize(locationClause ? subject : remainder);
  const type = accommodationTypes.find(candidate => typePhrases[candidate].test(categoryText) &&
    genericSubject.test(categoryText.replace(typePhrases[candidate], "").trim()));
  const subjectText = type ? normalize(subject).replace(typePhrases[type], "").trim() : normalize(subject);
  const namedQuery = subject && !genericSubject.test(subjectText) ? subject : "";

  if (!state && !selectedCity) {
    const typeOnly = type && !locationClause && genericSubject.test(normalize(main).replace(typePhrases[type], "").trim());
    return { q: typeOnly ? "" : fallback.q, ...(type && { type }) };
  }

  const compatible = matchingLocations.filter(location => !selectedCity || location.city === selectedCity);
  const nextState = state ?? (current.state && !compatible.some(location => location.state === current.state) ? "" : undefined);
  const nextCity = selectedCity ?? (current.city && !compatible.some(location => location.city === current.city) ? "" : undefined);
  const effectiveState = nextState ?? current.state;
  const effectiveCity = nextCity ?? current.city;
  const nextLocality = selectedLocality ?? (current.locality && !compatible.some(location =>
    location.city === effectiveCity && (!effectiveState || location.state === effectiveState) &&
    location.locality === current.locality) ? "" : undefined);

  const remainingQuery = type && !locationClause ? remainder.replace(typePhrases[type], "").trim() : remainder;
  return {
    q: (namedQuery || (!genericSubject.test(remainingQuery) && remainingQuery) || selectedLocality || selectedCity || "").slice(0, 120),
    ...(nextState !== undefined && { state: nextState }),
    ...(nextCity !== undefined && { city: nextCity }),
    ...(nextLocality !== undefined && { locality: nextLocality }),
    ...(type && { type }),
  };
}
