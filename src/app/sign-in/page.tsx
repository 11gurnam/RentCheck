import { AuthScreen } from "@/features/accounts/auth-screen";
import { getVerifiedUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { safeDestination } from "@/features/accounts/validation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const input = await searchParams;
  if (await getVerifiedUser()) redirect(safeDestination(input.next));
  return <AuthScreen mode="sign-in" next={input.next} notice={input.notice} />;
}
