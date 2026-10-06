import { z } from "zod";
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
    propertyRating: z.coerce.number().int().min(1).max(5),
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
  id: string;
  property_id: string;
  property_name: string;
  status: string;
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
export type ReviewState = { message?: string };
