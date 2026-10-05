import { AccountShell } from "@/components/ui/account-shell";
import { getPublicEnvironment } from "@/lib/environment";
import { AccountForm } from "./forms";
import { safeDestination } from "./validation";

export function AuthScreen({
  mode,
  next,
  notice,
}: {
  mode: "sign-in" | "register";
  next?: string;
  notice?: string;
}) {
  const configured = !!getPublicEnvironment();
  return (
    <AccountShell>
      <div className="auth-grid">
        <aside className="auth-story">
          <p className="eyebrow">A MORE INFORMED MOVE · INDIA</p>
          <h1>
            A place for your
            <br />
            <em>perspective.</em>
          </h1>
          <p>
            Start with an account. Your experiences can help someone else make a
            more informed move.
          </p>
          <ul className="account-points">
            <li>A public alias, a private identity.</li>
            <li>One account for renting and managing.</li>
            <li>Your voice stays yours.</li>
          </ul>
          <p className="field-hint">
            Property discovery, reviews and landlord claims arrive in later
            phases.
          </p>
        </aside>
        <section className="auth-card" aria-labelledby="auth-heading">
          <p className="eyebrow">YOUR RENTCHECK ACCOUNT</p>
          <h2 id="auth-heading">
            {mode === "register" ? "Make yourself at home." : "Welcome back."}
          </h2>
          <p className="auth-description">
            {mode === "register"
              ? "Choose an alias and create your private account."
              : "Sign in to your private account."}
          </p>
          {notice === "signed-out" && (
            <p className="form-feedback success" role="status">
              You’ve been signed out.
            </p>
          )}
          {notice === "auth-error" && (
            <p className="form-feedback error" role="alert">
              Sign-in couldn’t finish. Try again, or request a new confirmation
              email by registering again.
            </p>
          )}
          {configured ? (
            <AccountForm
              mode={mode}
              next={safeDestination(next)}
              googleEnabled={process.env.GOOGLE_AUTH_ENABLED === "true"}
            />
          ) : (
            <div className="setup-notice" role="status">
              <strong>Accounts aren’t connected yet.</strong>
              <p>
                The account service is being set up. Please return shortly; the
                public introduction is available now.
              </p>
            </div>
          )}
          <p className="auth-switch">
            {mode === "register"
              ? "Already have an account?"
              : "New to RentCheck?"}{" "}
            <a
              href={
                mode === "register"
                  ? `/sign-in?next=${encodeURIComponent(safeDestination(next))}`
                  : "/register"
              }
            >
              {mode === "register" ? "Sign in" : "Create account"}
            </a>
          </p>
          <p className="auth-privacy">
            Your email and account identity are private. Only your chosen alias
            appears publicly.
          </p>
        </section>
      </div>
    </AccountShell>
  );
}
