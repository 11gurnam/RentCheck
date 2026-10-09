import { AccountShell } from "@/components/ui/account-shell";
import { AliasForm, SignOutForm } from "@/features/accounts/forms";
import { getOwnProfile, requireUser } from "@/lib/auth/session";

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await getOwnProfile();
  return (
    <AccountShell>
      <div className="dashboard-heading account-page-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE SPACE</p>
          <h1>Your account.</h1>
          <p>Manage your public identity and view your private account details.</p>
        </div>
        <SignOutForm />
      </div>
      {profile ? (
        <div className="dashboard-grid account-panels">
          <section className="dashboard-card">
            <div className="account-panel-title"><span className="account-panel-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg></span><div><p className="eyebrow">PUBLIC PROFILE</p><h2>Your public voice</h2></div></div>
            <AliasForm alias={profile.public_alias} />
          </section>
          <section className="dashboard-card">
            <div className="account-panel-title"><span className="account-panel-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6Z" /><path d="m8 12 3 3 5-6" /></svg></span><div><p className="eyebrow">ONLY VISIBLE TO YOU</p><h2>Private account details</h2></div></div>
            <dl>
              <dt>Email address</dt>
              <dd>{user.email}</dd>
              <dt>Account access</dt>
              <dd><span className="account-access-badge">Renter</span> <span className="account-access-badge">Representative claimant</span></dd>
              <dt>Administrator access</dt>
              <dd>
                {profile.is_administrator
                  ? "Granted by a trusted administrator"
                  : "Not granted"}
              </dd>
            </dl>
            <p className="field-hint account-privacy-note">
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
