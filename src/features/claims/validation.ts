import { z } from "zod";
export const detailsSchema = z
  .object({
    claim: z.uuid(),
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().max(3000),
    min: z.coerce.number().int().min(0).max(10000000).optional(),
    max: z.coerce.number().int().min(0).max(10000000).optional(),
    reason: z.string().trim().min(10).max(2000),
  })
  .strict()
  .refine(
    (v) =>
      (v.min === undefined && v.max === undefined) ||
      (v.min !== undefined && v.max !== undefined && v.max >= v.min),
    { message: "Check rent range." },
  );
export const replySchema = z
  .object({
    claim: z.uuid(),
    review: z.uuid(),
    body: z.string().trim().min(10).max(3000),
  })
  .strict();
