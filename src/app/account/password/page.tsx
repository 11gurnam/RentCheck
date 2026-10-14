import { AccountShell } from "@/components/ui/account-shell";
import { PasswordForm } from "@/features/privacy/privacy-forms";
import { requireUser } from "@/lib/auth/session";
export default async function PasswordPage() {
  await requireUser("/account/password");
  return (
    <AccountShell>
      <h1>Choose a new password</h1>
      <PasswordForm />
      <p>
        <a href="/account">Back to your account</a>
      </p>
    </AccountShell>
  );
}
