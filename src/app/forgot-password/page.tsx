import { AccountShell } from "@/components/ui/account-shell";
import { RecoveryForm } from "@/features/privacy/privacy-forms";
export default function ForgotPasswordPage() {
  return (
    <AccountShell>
      <h1>Recover your account</h1>
      <p>Request an email link to choose a new password.</p>
      <RecoveryForm />
      <p>
        <a href="/sign-in">Back to sign in</a>
      </p>
    </AccountShell>
  );
}
