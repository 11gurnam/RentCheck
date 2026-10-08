import { AccountShell } from "@/components/ui/account-shell";
import { DeleteAccountForm } from "@/features/privacy/privacy-forms";
import { requireUser } from "@/lib/auth/session";
export default async function PrivacyPage() {
  await requireUser("/account/privacy");
  return (
    <AccountShell>
      <h1>Account privacy and deletion</h1>
      <DeleteAccountForm />
      <p>
        <a href="/account">Keep my account</a>
      </p>
    </AccountShell>
  );
}
