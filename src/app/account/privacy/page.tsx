import { AccountShell } from "@/components/ui/account-shell";
import { AccountPrivacyPanel } from "@/features/accounts/settings-panels";
import { requireUser } from "@/lib/auth/session";

export default async function Page() {
  await requireUser("/account/privacy");
  return <AccountShell><AccountPrivacyPanel/></AccountShell>;
}
