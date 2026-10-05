import { NextResponse } from "next/server";
import { createDatabaseClient } from "@/lib/database/server";
import { getSiteOrigin } from "@/lib/environment";
import { safeDestination } from "./validation";

export async function completeAuthentication(
  request: Request,
  mode: "code" | "email",
) {
  const params = new URL(request.url).searchParams;
  const failure = () =>
    NextResponse.redirect(`${getSiteOrigin()}/sign-in?notice=auth-error`, {
      headers: { "Cache-Control": "private, no-store" },
    });
  try {
    const client = await createDatabaseClient();
    if (mode === "code") {
      const code = params.get("code");
      if (!code || code.length > 2048) return failure();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) return failure();
    } else {
      const token = params.get("token_hash");
      if (
        !token ||
        token.length > 2048 ||
        !["email", "signup"].includes(params.get("type") ?? "")
      )
        return failure();
      const { error } = await client.auth.verifyOtp({
        token_hash: token,
        type: "email",
      });
      if (error) return failure();
    }
    return NextResponse.redirect(
      `${getSiteOrigin()}${safeDestination(params.get("next"))}`,
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return failure();
  }
}
