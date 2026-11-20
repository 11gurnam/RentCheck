import { AccountShell } from "@/components/ui/account-shell";
import { NotificationsPanel } from "@/features/accounts/settings-panels";
import { requireUser } from "@/lib/auth/session";

export default async function Page() {
  await requireUser("/account/notifications");
  return <AccountShell><NotificationsPanel/></AccountShell>;
}
