import { accommodationTypes } from "../discovery/filters";
import { withinOneEdit } from "./spelling";

export function requestsAnyArea(text: string, previousCity = "") {
  if (previousCity && [`not just ${previousCity}`, `not only ${previousCity}`].includes(text)) return true;
  return /\b(?:no (?:city|location) preference|across india|(?:anywhere|everywhere|any city|all cities) in india|nationwide|countrywide)\b/.test(text) ||
    /\b(?:anywhere|everywhere|any city|all cities|any state|all states|any location|any area)\b(?!\s+(?:in|around|near|within|from|between|except|but)\b)/.test(text);
}

export function requestedArea(message: string) {
  const { text, replacement } = areaTarget(message);
  const place = /\b(?:in|around|near|within|what about|how about|try)\s+([\p{L}][\p{L}\p{M} .'-]{1,59}?)(?=\s+(?:under|below|up to|at most|less than|above|over|for|with|now|instead|only|and)\b|[?,.!]|\d|$)/iu.exec(replacement ? `in ${text}` : text)?.[1]?.trim();
  if (replacement && place && accommodationTypes.some(type => [type.toLowerCase(), type.toLowerCase() + "s"].includes(place.toLowerCase()))) return undefined;
  return place && !/^(?:me|my|your|our|this|these|the|budget|price|india|under|below|above|anywhere|anything|properties|places)(?:\s|$)/i.test(place) &&
    !/\b(?:rent|budget|bachelors?|couples?|students?|ratings?|verified|recommendations?)\b/i.test(place) ? place : undefined;
}

export function areaTarget(message: string) {
  const replacement = /\b(?:switch|move|change|replace)\b[^,;.!?]*?\s+(?:to|with)\s+(.+)|^\s*not\s+(?!just\b|only\b)[^,;]+[,;]\s*(.+)/i.exec(message);
  return { text: (replacement?.[1] ?? replacement?.[2] ?? message).split(/\binstead of\b/i, 1)[0].trim(), replacement: !!replacement };
}

export function isLikelyCityTypo(actual: string, requested: string) {
  return requested.length >= 5 && actual[0] === requested[0] && withinOneEdit(actual, requested);
}
