import { z } from "zod";
import { accommodationTypes, filtersSchema } from "@/features/discovery/filters";
import { rentalOptions } from "@/features/property-information/preferences";
import { adminContextSchema, type AdminContext, type AssistantRole } from "./admin-schema";

export const messageLimit = 600;
export const topics = [
  "about", "my_reviews", "profile", "claim", "my_claims", "review", "verification", "badge",
  "women", "report", "photos", "replies", "shortlist", "compare", "map", "privacy", "messages",
] as const;
export const modes = ["search", "count", "average", "rating", "women_rating", "nearby"] as const;
export const clearableFilters = ["location", "city", "locality", "state", "budget", "min", "max", "type", "eligibility", "rating", "women", "verification", "q"] as const;

export const intentSchema = z.strictObject({
  kind: z.enum(["property", "help", "greeting", "other"]),
  mode: z.enum(modes).optional(),
  topic: z.enum(topics).optional(),
  reset: z.boolean().optional(),
  clear: z.array(z.enum(clearableFilters)).max(clearableFilters.length).optional(),
  filters: z.strictObject({
    q: z.string().trim().max(120).optional(),
    state: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    locality: z.string().trim().max(100).optional(),
    type: z.enum(["", ...accommodationTypes]).optional(),
    min: z.number().int().min(0).max(10000000).optional(),
    max: z.number().int().min(0).max(10000000).optional(),
    rating: z.number().min(0).max(5).optional(),
    women: z.enum(["", "recommended", "reviews", "safety"]).optional(),
    verification: z.enum(["", "reviews", "current", "former"]).optional(),
    eligibility: z.array(z.enum(rentalOptions.map(([value]) => value))).max(rentalOptions.length).optional(),
  }).optional(),
});

export const contextSchema = z.strictObject({
  filters: filtersSchema,
  mode: z.enum(modes),
  needsCity: z.boolean().optional(),
});

export const assistantRequest = z.strictObject({
  message: z.string().trim().min(1).max(messageLimit).optional(),
  context: contextSchema.optional(),
  adminContext: adminContextSchema.optional(),
  page: z.string().max(500).optional(),
  location: z.strictObject({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  }).optional(),
}).refine(input => Boolean(input.message) !== Boolean(input.location));

export type Intent = z.infer<typeof intentSchema>;
export type ClearableFilter = (typeof clearableFilters)[number];
export type Topic = (typeof topics)[number];
export type AssistantRequest = z.infer<typeof assistantRequest>;
export type AssistantContext = z.infer<typeof contextSchema>;
export type AssistantLink = { label: string; href: string };
export type AssistantProperty = {
  id: string;
  name: string;
  city: string;
  locality: string;
  rent_min: number;
  rent_max: number;
  is_demo: boolean;
  property_rating: number | null;
  womenRating: number | null;
  preferences: string[];
  verified: boolean;
};
export type AssistantReply = {
  text: string;
  role?: AssistantRole;
  viewer?: string;
  adminContext?: AdminContext;
  records?: { title: string; detail: string; links?: AssistantLink[] }[];
  navigate?: string;
  links?: AssistantLink[];
  properties?: AssistantProperty[];
  nearBudget?: { limit: number; properties: AssistantProperty[] };
  offerLocation?: boolean;
  context?: AssistantContext;
  searchHref?: string;
};
