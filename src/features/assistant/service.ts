import "server-only";
import { parseFilters } from "@/features/discovery/filters";
import { requestedArea } from "./area-request";
import { hasBudgetAmount } from "./budget-request";
import { filterPatch } from "./filter-update";
import { helpReply, normalize, retrieveHelp } from "./knowledge";
import { localIntent, modelIntent } from "./intent";
import { propertyReply } from "./properties";
import { publicDetails } from "./public-details";
import type { AssistantReply, AssistantRequest, Intent } from "./schema";

export async function answerAssistant(input: AssistantRequest): Promise<AssistantReply> {
  if (input.location) {
    const { latitude, longitude } = input.location;
    if (latitude < 6 || latitude > 38 || longitude < 68 || longitude > 98) {
      return { text: "RentCheck covers India. Which Indian city or locality should I search?", context: input.context };
    }
    return propertyReply({ ...input, location: { latitude: Number(latitude.toFixed(2)), longitude: Number(longitude.toFixed(2)) } }, { kind: "property", mode: "nearby" });
  }
  const message = input.message!;
  const plain = normalize(message);
  if (/^(?:what is your name|what s your name|who are you|what should i call you)$/.test(plain)) {
    return { text: "My name is RentWise, your rent assistant.", context: input.context };
  }
  const details = await publicDetails(input);
  if (details) return { ...details, context: input.context };
  if (!input.context && /^\/search\?/.test(input.page ?? "")) {
    const params = new URLSearchParams(input.page?.split("?")[1]);
    const filters = parseFilters({ ...Object.fromEntries(params), eligibility: params.getAll("eligibility") });
    if (filters.success) input = { ...input, context: { filters: filters.data, mode: "search" } };
  }
  const passages = retrieveHelp(message);
  const fallback = localIntent(message, input.context, passages);
  const budgetMentioned = hasBudgetAmount(message);
  const localBudget = fallback.filters?.min !== undefined || fallback.filters?.max !== undefined;
  const straightforward = (!budgetMentioned || localBudget) && (fallback.kind === "greeting" ||
    (fallback.kind === "help" && (passages[0]?.score ?? 0) >= 7) ||
    (fallback.kind === "property" && (fallback.reset || input.context?.needsCity ||
      fallback.mode === "nearby" ||
      /^how many (?:properties|places)(?: are (?:listed|available)(?: on rentcheck)?)?(?: in [\p{L} ]+)?$/u.test(plain) ||
      /^\b(?:find|show|list)(?: me)? (?:properties|places|rentals) in [\p{L} ]+$/u.test(plain) ||
      (plain.split(" ").length <= 7 && (fallback.clear?.length || Object.keys(fallback.filters ?? {}).length > 0 || requestedArea(message))))));
  const proposed = straightforward ? null : await modelIntent(message, input.context, passages);
  const clearFallback = fallback.kind === "property" && (localBudget || fallback.clear?.length || fallback.reset);
  let intent: Intent = !proposed || (proposed.kind === "other" && fallback.kind !== "other") ||
    (clearFallback && proposed.kind !== "property") ? fallback : proposed;
  if (intent.kind === "property" && fallback.kind === "property") {
    const explicitMode = fallback.mode !== "search" || fallback.filters?.women === "recommended";
    intent = {
      ...intent,
      mode: explicitMode ? fallback.mode : intent.mode ?? fallback.mode,
      reset: fallback.reset || (intent.reset && /\b(?:fresh|new search|forget|start from scratch|previous filters|begin again)\b/.test(plain)),
      clear: [...new Set([...(intent.clear ?? []), ...(fallback.clear ?? [])])],
      filters: { ...intent.filters, ...filterPatch({ kind: "property", clear: fallback.clear }), ...fallback.filters },
    };
  }
  if (intent.kind === "help" && intent.topic) {
    return { ...helpReply(intent.topic, input.page, message), context: input.context };
  }
  if (intent.kind === "property") {
    if (budgetMentioned && intent.filters?.min === undefined && intent.filters?.max === undefined &&
      !intent.clear?.some(filter => filter === "budget" || filter === "min" || filter === "max") && !/\d/.test(intent.filters?.q ?? "")) {
      return { text: "What monthly rent limit should I use?", context: input.context };
    }
    return propertyReply(input, intent);
  }
  return {
    text: intent.kind === "greeting"
      ? "Hi! Ask me about rent, properties in a city or how to use RentCheck."
      : "I can help find and compare properties, explain tenant verification, or take you to parts of RentCheck. What would you like to find?",
    links: [{ label: "Explore properties", href: "/search" }],
    context: input.context,
  };
}
