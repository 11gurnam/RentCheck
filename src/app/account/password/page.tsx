import { AccountShell } from "@/components/ui/account-shell";
import { PasswordPanel } from "@/features/accounts/settings-panels";
import { requireUser } from "@/lib/auth/session";

export default async function Page() {
  await requireUser("/account/password");
  return <AccountShell><PasswordPanel/></AccountShell>;
}
