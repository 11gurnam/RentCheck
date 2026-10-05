import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});

// Validate only when a backend feature needs configuration; the introduction is public.
export function parsePublicEnvironment(
  input: Record<string, string | undefined>,
) {
  return publicEnvironmentSchema.parse(input);
}
