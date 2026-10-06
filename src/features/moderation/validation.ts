import { z } from "zod";
const reason = z.string().trim().min(10).max(2000);
export const reportSchema = z.object({ review: z.uuid(), reason }).strict();
export const mergeSchema = z
  .object({
    source: z.uuid(),
    target: z.uuid(),
    archive: z.array(z.uuid()),
    revoke: z.array(z.uuid()),
    history: z.enum(["source", "target"]),
    details: z.enum(["source", "target"]),
    reason,
    confirm: z.literal("on"),
  })
  .refine((v) => v.source !== v.target, {
    message: "Choose two different profiles.",
  });
export const associationSchema = z
  .object({
    property: z.uuid(),
    landlord: z.uuid(),
    start: z.iso.date(),
    end: z.union([z.literal(""), z.iso.date()]),
    replace: z.union([z.literal(""), z.uuid()]),
    reason,
  })
  .refine((v) => !v.end || v.end > v.start, {
    message: "End must follow start.",
  });
