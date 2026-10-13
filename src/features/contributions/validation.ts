import { z } from "zod";
import { canonicalState } from "../addresses/india";
const short = (max: number) =>
  z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(max)
    .refine(
      (v) => !/[<>\p{Cc}]/u.test(v),
      "Avoid markup and control characters.",
    );
export const contributionSchema = z
  .object({
    name: short(120).min(3),
    address: short(300).min(5),
    state: short(80).refine(value=>!!canonicalState(value),"Select an Indian state or union territory."),
    city: short(80),
    locality: short(100),
    type: z.enum(["Flat", "House", "PG", "Hostel", "Homestay"]),
    min: z.coerce.number().int().min(0).max(10000000),
    max: z.coerce.number().int().min(0).max(10000000),
    description: z.string().trim().max(3000),
    synthetic: z.literal("on", "Confirm this is synthetic demo data."),
    declaredOwner: z.string().optional(),
    acknowledged: z.string().optional(),
    postalCode: z.string().regex(/^$|^[1-9]\d{5}$/,"Enter a six-digit PIN code.").optional().default(""),
    latitude: z.union([z.literal(""),z.coerce.number().min(6).max(38)]).optional().default(""),
    longitude: z.union([z.literal(""),z.coerce.number().min(68).max(98)]).optional().default(""),
    shareLocation: z.enum(["on",""]).optional(),
  })
  .refine(value=>value.shareLocation!=="on"||(typeof value.latitude==="number"&&typeof value.longitude==="number"),{path:["latitude"],message:"Choose both property coordinates before sharing the pin."})
  .refine((v) => v.max >= v.min, {
    path: ["max"],
    message: "Maximum rent must be at least minimum rent.",
  });
export type Duplicate = {
  id: string;
  name: string;
  address: string;
  city: string;
  exact: boolean;
};
export type ContributionState = {
  status?: "success" | "error" | "warning" | "idle";
  message?: string;
  candidates?: Duplicate[];
};
