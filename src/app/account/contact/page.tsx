import { AccountShell } from "@/components/ui/account-shell";
import { ContactSettingsPanel } from "@/features/accounts/settings-panels";
import { requireUser } from "@/lib/auth/session";

export default async function Page() {
  await requireUser("/account/contact");
  return <AccountShell><ContactSettingsPanel/></AccountShell>;
}
