import { getVerifiedUser, isAdministrator } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  if (!(await getVerifiedUser()))
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await isAdministrator()))
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  return NextResponse.json(
    { access: "administrator" },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
