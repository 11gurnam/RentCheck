import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(1)
    .refine(
      isPublicKey,
      "Use a publishable or legacy anon key, never a secret key.",
    ),
});

function isPublicKey(value: string) {
  if (value.startsWith("sb_secret_")) return false;
  if (value.split(".").length !== 3) return true;
  try {
    const payload = JSON.parse(
      atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.role !== "service_role";
  } catch {
    return false;
  }
}

export function getPublicEnvironment() {
  const result = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return result.success ? result.data : null;
}

export function getSiteOrigin() {
  return new URL(z.url().parse(process.env.SITE_URL ?? "http://127.0.0.1:3000"))
    .origin;
}

// Validate only when a backend feature needs configuration; the introduction is public.
export function parsePublicEnvironment(
  input: Record<string, string | undefined>,
) {
  return publicEnvironmentSchema.parse(input);
}
