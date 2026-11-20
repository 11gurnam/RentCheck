import Link from "next/link";
import { EvidencePolicyPanel } from "@/features/privacy/evidence-policy";
import { AccountPrivacyPanel, ContactSettingsPanel, MessagesPanel, NotificationsPanel, PasswordPanel } from "@/features/accounts/settings-panels";
import { TenantVerificationStatus } from "@/features/verification/account-status";
import { AccountShell } from "@/components/ui/account-shell";
import { AliasForm, SignOutForm } from "@/features/accounts/forms";
import { getOwnProfile, requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { displayDate } from "@/lib/display-date";
import { ProfilePhotoForm } from "@/features/accounts/photo-form";
import { PasswordForm } from "@/features/accounts/password-form";
import { ActionIcon } from "@/components/ui/action-feedback";
import { WomenProgramPreferences } from "@/features/women-program/forms";
import { myWomenProgram } from "@/features/women-program/data";

const tabs = [
  ["overview", "Overview"], ["messages", "Your messages"], ["contact", "Contact settings"],
  ["notifications", "Notifications"], ["password", "Change password"], ["privacy", "Privacy and deletion"],
  ["tenant-profile", "Private tenant profile"], ["evidence-policy", "Evidence retention policy"],
] as const;

const panels = { messages: MessagesPanel, contact: ContactSettingsPanel, notifications: NotificationsPanel,
  password: PasswordPanel, privacy: AccountPrivacyPanel, "evidence-policy": EvidencePolicyPanel };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  const requestedTab = Array.isArray(tab) ? tab[0] : tab;
  const user = await requireUser(requestedTab ? `/account?${new URLSearchParams({ tab: requestedTab })}` : "/account");
  const admin = await isAdministrator();
  const availableTabs = tabs.filter(([value]) => !admin || value !== "messages");
  const selectedTab = availableTabs.find(([value]) => value === requestedTab)?.[0] ?? "overview";
  const Panel = selectedTab === "overview" || selectedTab === "tenant-profile" ? null : panels[selectedTab];
  return (
    <AccountShell>
      <div className="dashboard-heading account-page-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE SPACE</p>
          <h1>Your account.</h1>
          <p>{admin ? "Your administrator profile, account settings, and platform controls." : "Your RentCheck profile, tenant experiences, and saved places."}</p>
        </div>
        <SignOutForm />
      </div>
      <nav className="pagination account-settings-tabs" aria-label="Account settings">
        {availableTabs.map(([value, label]) => (
          <Link key={value} href={value === "overview" ? "/account" : `/account?tab=${value}`} scroll={false} prefetch={false} aria-current={value === selectedTab ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      <div className="account-tab-content" key={selectedTab}>
        {Panel ? <Panel embedded/> : selectedTab === "tenant-profile" ? <PrivateTenantPanel/> : <AccountOverview user={user} admin={admin}/>}
      </div>
    </AccountShell>
  );
}

async function AccountOverview({ user, admin }: { user: Awaited<ReturnType<typeof requireUser>>; admin: boolean }) {
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
    <>
      {profile ? (
        <div className="dashboard-grid account-panels">
          <section className="dashboard-card">
            <div className="account-panel-title"><span className="account-panel-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg></span><div><p className="eyebrow">PUBLIC PROFILE</p><h2>Public profile</h2></div></div>
            <div className="account-user-summary"><div><strong>{profile.public_alias}</strong><span>RentCheck member since {displayDate(user.created_at)}</span></div></div>
            <p className="field-hint">{admin ? "Your display name identifies you in administrative records." : "This public name appears beside your reviews and replies."}</p>
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
              <dd>{admin ? "Manage properties, users, verification, and moderation." : "Share tenant experiences, rate essentials, and shortlist places."}</dd>
            </dl>
            <p className="field-hint account-privacy-note">
              {admin ? "Your email stays private. Administrative actions are recorded in the platform audit log." : "Your email stays private. Your public alias appears on reviews; your shortlist is visible only to you."}
            </p>
            <div className="account-security-action"><PasswordForm />{!admin && <a className="review-action" href="/account/appeals">Reports and appeals</a>}
            {admin && (
              <a className="text-link" href="/admin">
                Admin Dashboard
              </a>
            )}
            </div>
          </section>
          {!admin && <TenantVerificationStatus />}
          <section className="dashboard-card account-activity-panel">
            <p className="eyebrow">YOUR RENTCHECK ACTIVITY</p>
            <h2>{admin ? "Your admin workspace" : "Your next move"}</h2>
            <div className="account-activity-grid">
              {admin ? <>
                <a href="/search" className="account-activity-item"><ActionIcon name="search" /><div><strong>Explore</strong><span>Browse properties</span><small>View places and tenant feedback</small></div></a>
                <a href="/properties/new" className="account-activity-item"><ActionIcon name="edit" /><div><strong>Add a place</strong><span>Create a property profile</span><small>Add a place to RentCheck</small></div></a>
                <a href="/admin" className="account-activity-item"><ActionIcon name="shield" /><div><strong>Admin Dashboard</strong><span>Manage RentCheck</span><small>Open the platform dashboard</small></div></a>
              </> : <>
              <a href="/account/reviews" className="account-activity-item"><ActionIcon name="edit" /><div><strong>{reviews ? reviews.filter(r => r.status === "visible").length : "—"}</strong><span>Published reviews</span><small>{reviews ? "View and manage your experiences" : "Open your reviews to view activity"}</small></div></a>
              <a href="/saved" className="account-activity-item"><ActionIcon name="save" /><div><strong>{saved ? saved.length : "—"}</strong><span>Saved places</span><small>Return to your private shortlist</small></div></a>
              <a href="/search" className="account-activity-item"><ActionIcon name="search" /><div><strong className="account-explore-value">Explore</strong><span>Find a place</span><small>Explore places and tenant ratings</small></div></a>
              </>}
            </div>
          </section>
        </div>
      ) : (
        <div className="setup-notice" role="alert">
          <strong>We couldn’t load your account profile.</strong>
          <p>
            Refresh to try again.
          </p>
        </div>
      )}
    </>
  );
}

async function PrivateTenantPanel() {
  const preferences = await myWomenProgram();
  return preferences ? <WomenProgramPreferences preferences={preferences}/> : <p>Private tenant profile is unavailable.</p>;
}
