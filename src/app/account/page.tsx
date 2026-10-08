import { AccountShell } from "@/components/ui/account-shell";
import { AliasForm, SignOutForm } from "@/features/accounts/forms";
import { getOwnProfile, requireUser } from "@/lib/auth/session";

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await getOwnProfile();
  return (
    <AccountShell>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE SPACE</p>
          <h1>Your account.</h1>
        </div>
        <SignOutForm />
      </div>
      <nav className="pagination" aria-label="Account settings">
        <a href="/messages">Private conversations</a>
        <a href="/account/notifications">Notifications</a>
        <a href="/account/password">Change password</a>
        <a href="/account/privacy">Privacy and deletion</a>
      </nav>
      {profile ? (
        <div className="dashboard-grid">
          <section className="dashboard-card">
            <h2>Your public voice</h2>
            <AliasForm alias={profile.public_alias} />
          </section>
          <section className="dashboard-card">
            <h2>Private account details</h2>
            <dl>
              <dt>Email address</dt>
              <dd>{user.email}</dd>
              <dt>Account access</dt>
              <dd>Renter and representative claimant</dd>
              <dt>Administrator access</dt>
              <dd>
                {profile.is_administrator
                  ? "Granted by a trusted administrator"
                  : "Not granted"}
              </dd>
            </dl>
            <p className="field-hint">
              Email and account identity are visible only to you. Representative
              controls require an approved demonstration claim.
            </p>
            {profile.is_administrator && (
              <a className="text-link" href="/admin">
                Administrator area →
              </a>
            )}
          </section>
        </div>
      ) : (
        <div className="setup-notice" role="alert">
          <strong>We couldn’t load your account profile.</strong>
          <p>
            Refresh to try again. If this continues, the account database setup
            needs attention.
          </p>
        </div>
      )}
    </AccountShell>
  );
}
