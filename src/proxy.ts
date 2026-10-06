import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnvironment, getSiteOrigin } from "@/lib/environment";

export async function proxy(request: NextRequest) {
  const environment = getPublicEnvironment();
  if (!environment) return NextResponse.next();
  let response = NextResponse.next({ request });
  const client = createServerClient(
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
        getAll: () => request.cookies.getAll(),
        setAll: (entries) => {
          entries.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          entries.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  try {
    await client.auth.getClaims();
  } catch {
    /* Pages and actions deny access when the auth service cannot verify a user. */
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/sign-in",
    "/register",
    "/auth/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/reviews/:path*",
    "/api/:path*",
    "/saved",
    "/claims/:path*",
    "/properties/:path*",
  ],
};
