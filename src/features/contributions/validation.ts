import { z } from "zod";
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
    state: short(80),
    city: short(80),
    locality: short(100),
    type: z.enum(["Flat", "House", "PG", "Hostel"]),
    min: z.coerce.number().int().min(0).max(10000000),
    max: z.coerce.number().int().min(0).max(10000000),
    description: z.string().trim().max(3000),
    synthetic: z.literal("on", "Confirm this is synthetic demo data."),
    declaredOwner: z.string().optional(),
    acknowledged: z.string().optional(),
  })
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
  message?: string;
  status: "idle" | "error";
  candidates?: Duplicate[];
};
