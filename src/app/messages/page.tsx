import { AccountShell } from "@/components/ui/account-shell";
import { MessagesPanel } from "@/features/accounts/settings-panels";
import { requireUser } from "@/lib/auth/session";

export default async function Page() {
  await requireUser("/messages");
  return <AccountShell><MessagesPanel/></AccountShell>;
}
