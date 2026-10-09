import { z } from "zod";
import type { CriterionRating } from "./criteria";
export const criteriaSchema = z.array(z.object({
  key: z.string().min(1).max(80),
  label: z.string().trim().min(2).max(60),
  rating: z.number().min(0.5).max(5).multipleOf(0.5),
  custom: z.boolean().optional(),
})).min(5).max(13).superRefine((items, context) => {
  if (new Set(items.map(c => c.key)).size !== items.length || new Set(items.map(c => c.label.toLowerCase())).size !== items.length)
    context.addIssue({ code: "custom", message: "Use distinct names for each rating criterion." });
  if (items.filter(c => c.custom).length > 5)
    context.addIssue({ code: "custom", message: "Add up to five custom criteria." });
});
export const todayIndia = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const reviewSchema = z
  .object({
    property: z.uuid(),
    start: z.iso.date(),
    end: z.union([z.literal(""), z.iso.date()]),
    current: z.enum(["true", "false"]),
    paid: z.coerce.number().int().min(0).max(10000000),
    propertyRating: z.coerce.number().min(0.5).max(5),
    managerRating: z.union([
      z.literal(""),
      z.coerce.number().int().min(1).max(5),
    ]),
    body: z.string().trim().min(10).max(5000),
    woman: z.literal("on").optional(),
    recommend: z.enum(["", "true", "false"]),
    synthetic: z.literal("on"),
  })
  .superRefine((v, c) => {
    if (
      v.start > todayIndia() ||
      (v.current === "true" && v.end !== "") ||
      (v.current === "false" &&
        (!v.end || v.end < v.start || v.end > todayIndia()))
    )
      c.addIssue({
        code: "custom",
        message:
          "Check tenancy dates. Current tenancies have no end; former tenancies need an end date from start through today.",
      });
  });
export type OwnReview = {
  property_type: string;
  criteria: CriterionRating[];
  id: string;
  property_id: string;
  property_name: string;
  status: string;
  archived: boolean;
  body: string;
  propertyRating: number;
  managerRating: number | null;
  start: string;
  end: string | null;
  current: boolean;
  paid: number;
  woman: boolean;
  recommend: boolean | null;
  was_edited: boolean;
};
export type ReviewState = { message?: string; status?: "success" | "error" | "warning" };
