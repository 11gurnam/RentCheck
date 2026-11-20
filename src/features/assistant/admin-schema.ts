import { z } from "zod";

export type AssistantRole = "user" | "admin";
export const resources = [
  "overview", "properties", "tenants", "verified_landlords", "verifications",
  "tenant_verifications", "ownership_claims", "complaints", "disputes", "flagged_properties",
  "disputed_properties", "complaint_ranking", "moderation", "decisions",
] as const;
export const actions = ["count", "list", "open"] as const;
export const statuses = ["pending", "under_review", "awaiting_information", "verified", "rejected",
  "disputed", "revoked", "unresolved", "resolved", "all"] as const;
export const adminIntentSchema = z.strictObject({
  resource: z.enum(resources),
  action: z.enum(actions),
  status: z.enum(statuses).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  days: z.number().int().min(1).max(3650).optional(),
  subject: z.string().trim().min(1).max(120).optional(),
  subjectKind: z.enum(["property", "landlord"]).optional(),
  decision: z.enum(["approved", "rejected", "both"]).optional(),
  applicationType: z.enum(["tenant", "landlord"]).optional(),
  abusive: z.boolean().optional(),
  reported: z.boolean().optional(),
});
const subjectSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1).max(250),
  city: z.string().max(100).optional(),
  kind: z.enum(["property", "manager", "claimant"]),
});
export const adminContextSchema = z.strictObject({
  intent: adminIntentSchema.omit({ subject: true }),
  subject: subjectSchema.optional(),
  choices: z.array(subjectSchema).max(5).optional(),
  records: z.array(z.strictObject({ name: z.string().max(250), href: z.string().max(350) })).max(5).optional(),
});
export type AdminIntent = z.infer<typeof adminIntentSchema>;
export type AdminContext = z.infer<typeof adminContextSchema>;
export type AdminSubject = z.infer<typeof subjectSchema>;

export const adminNavigation = /^\/admin(?:\/(?:properties|users|verification-management|disputes|reports|messages|reviews|audit))?(?:\?[^#\\\s]*)?(?:#(?:review|photo|message)-report-[\da-f-]{36})?$|^\/admin\/verification-management\/(?:tenant|landlord)\/[\da-f-]{36}$/i;
