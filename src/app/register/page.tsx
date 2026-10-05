import { AuthScreen } from "@/features/accounts/auth-screen";
import { getVerifiedUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  if (await getVerifiedUser()) redirect("/account");
  return <AuthScreen mode="register" />;
}
