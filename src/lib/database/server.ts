import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnvironment, getSiteOrigin } from "@/lib/environment";

export async function createDatabaseClient() {
  const environment = getPublicEnvironment();
  if (!environment) throw new Error("Backend configuration is unavailable.");
  const cookieStore = await cookies();
  return createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: getSiteOrigin().startsWith("https://"),
        path: "/",
      },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (entries) => {
          try {
            entries.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Server Components cannot write cookies; proxy refreshes them before rendering. */
          }
        },
      },
    },
  );
}
