import { getOwnProfile, getVerifiedUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  if (!(await getVerifiedUser()))
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const profile = await getOwnProfile();
  if (!profile)
    return NextResponse.json(
      { error: "Account profile unavailable." },
      { status: 503 },
    );
  return NextResponse.json(profile, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
