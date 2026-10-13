import { TenantVerificationStatus } from "@/features/verification/account-status";
import { AccountShell } from "@/components/ui/account-shell";
import { AliasForm, SignOutForm } from "@/features/accounts/forms";
import { getOwnProfile, requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { displayDate } from "@/lib/display-date";
import { ProfilePhotoForm } from "@/features/accounts/photo-form";
import { PasswordForm } from "@/features/accounts/password-form";
import { ActionIcon } from "@/components/ui/action-feedback";

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await getOwnProfile();
  const db = await createDatabaseClient();
  const results = profile ? await Promise.allSettled([
    db.rpc("get_my_reviews"),
    db.rpc("get_saved_properties"),
    db.from("public_profiles").select("avatar_url").eq("id",profile.profile_id).maybeSingle(),

  ]) : [];
  const reviews = results[0]?.status === "fulfilled" && !results[0].value.error ? results[0].value.data as { status: string }[] : null;
  const saved = results[1]?.status === "fulfilled" && !results[1].value.error ? results[1].value.data as { property_id: string }[] : null;
  const avatar = results[2]?.status === "fulfilled" && !results[2].value.error ? results[2].value.data?.avatar_url : null;
  return (
    <AccountShell>
      <div className="dashboard-heading account-page-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE SPACE</p>
          <h1>Your account.</h1>
          <p>Your RentCheck profile, tenant experiences, and saved places.</p>
        </div>
        <SignOutForm />
      </div>
      <nav className="pagination" aria-label="Account settings">
        <a href="/messages">Private conversations</a>
        <a href="/account/notifications">Notifications</a>
        <a href="/account/password">Change password</a>
        <a href="/account/privacy">Privacy and deletion</a>
        <a href="/privacy">Evidence retention policy</a>
      </nav>
      {profile ? (
        <div className="dashboard-grid account-panels">
          <section className="dashboard-card">
            <div className="account-panel-title"><span className="account-panel-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg></span><div><p className="eyebrow">PUBLIC PROFILE</p><h2>Public profile</h2></div></div>
            <div className="account-user-summary"><div><strong>{profile.public_alias}</strong><span>RentCheck member since {displayDate(user.created_at)}</span></div></div>
            <p className="field-hint">This public name appears beside your reviews and replies.</p>
            <ProfilePhotoForm name={profile.public_alias} src={avatar ?? null} />
            <AliasForm alias={profile.public_alias} />
          </section>
          <section className="dashboard-card">
            <div className="account-panel-title"><span className="account-panel-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6Z" /><path d="m8 12 3 3 5-6" /></svg></span><div><p className="eyebrow">ONLY VISIBLE TO YOU</p><h2>Account details</h2></div></div>
            <dl className="account-details-list">
              <dt>Email address</dt>
              <dd>{user.email}</dd>
              <dt>Email status</dt>
              <dd><span className={`semantic-status ${user.email_confirmed_at ? "status-success" : "status-warning"}`}><ActionIcon name={user.email_confirmed_at ? "check" : "warning"} />{user.email_confirmed_at ? "Verified" : "Not verified"}</span></dd>
              <dt>Member since</dt>
              <dd>{displayDate(user.created_at)}</dd>
              <dt>Your RentCheck activity</dt>
              <dd>Share tenant experiences, rate essentials, and shortlist places.</dd>
            </dl>
            <p className="field-hint account-privacy-note">
              Your email stays private. Your public alias appears on reviews; your shortlist is visible only to you.
            </p>
            <div className="account-security-action"><PasswordForm /></div>
            {profile.is_administrator && (
              <a className="text-link" href="/admin">
                Administrator area →
              </a>
            )}
          </section>
          <TenantVerificationStatus />
          <section className="dashboard-card account-activity-panel">
            <p className="eyebrow">YOUR RENTCHECK ACTIVITY</p>
            <h2>Your next move</h2>
            <div className="account-activity-grid">
              <a href="/account/reviews" className="account-activity-item"><ActionIcon name="edit" /><div><strong>{reviews ? reviews.filter(r => r.status === "visible").length : "—"}</strong><span>Published reviews</span><small>{reviews ? "View and manage your experiences" : "Open your reviews to view activity"}</small></div></a>
              <a href="/saved" className="account-activity-item"><ActionIcon name="save" /><div><strong>{saved ? saved.length : "—"}</strong><span>Saved places</span><small>Return to your private shortlist</small></div></a>
              <a href="/search" className="account-activity-item"><ActionIcon name="search" /><div><strong className="account-explore-value">Explore</strong><span>Find a place</span><small>Explore places and tenant ratings</small></div></a>
            </div>
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
