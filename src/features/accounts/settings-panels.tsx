import Link from "next/link";
import { createDatabaseClient } from "@/lib/database/server";
import { conversations } from "@/features/messaging/data";
import { ContactPreference } from "@/features/messaging/forms";
import { PhoneContactForm } from "@/features/messaging/phone-form";
import {
  NotificationCard,
  PasswordForm,
  DeleteAccountForm,
  type Notification,
} from "@/features/privacy/privacy-forms";

export async function MessagesPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const Heading = embedded ? "h2" : "h1";

  const threads = await conversations();
  const { data, error } = await (await createDatabaseClient()).rpc("get_contact_preference");
  if (error) throw new Error("Contact preference unavailable");
  return <><Heading>Your messages</Heading><p>Start from a property profile when an approved representative allows contact. Only participants can read a conversation. Administrators can see individual messages you report. Deleting either account deletes the conversation.</p><section className="dashboard-card"><h2>Messages from tenants</h2><ContactPreference enabled={data} /><Link className="text-link" href={embedded ? "/account?tab=contact" : "/account/contact"} scroll={!embedded}>Manage phone number and contact settings</Link></section><h2>Conversations</h2>{threads.length ? threads.map(t => <article key={t.id} className="dashboard-card"><h3><a href={`/messages/${t.id}`}>{t.property_name} · {t.other_alias}</a></h3><p>{t.blocked ? "Blocked" : t.contact_enabled ? "Contact available" : "Contact paused"}</p></article>) : <p>No conversations yet.</p>}</>;
}

export async function ContactSettingsPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const Heading = embedded ? "h2" : "h1";

 const db=await createDatabaseClient();
 const [phone,messages]=await Promise.all([db.rpc("get_my_property_contact_settings"),db.rpc("get_contact_preference")]);
 if(phone.error||messages.error)throw new Error("Contact settings unavailable");
 const settings=phone.data as {phone:string;show_publicly:boolean;has_claim:boolean;approved:boolean};
 return <><div className="contact-settings-page">{!embedded && <a className="text-link" href="/account">← Your account</a>}<header><p className="eyebrow">YOUR CONTACT PREFERENCES</p><Heading>Contact settings</Heading><p>Choose how tenants can reach you about your properties.</p></header>{settings.has_claim?<><section className="dashboard-card"><h2>Property contact number</h2><PhoneContactForm phone={settings.phone} showPublicly={settings.show_publicly} approved={settings.approved}/></section><section className="dashboard-card"><h2>Messages from tenants</h2><p className="field-hint">Allow in-app enquiries for properties covered by approved claims. Your mobile number is not shared through messages.</p><ContactPreference enabled={messages.data}/></section></>:<section className="dashboard-card"><h2>Represent a property?</h2><p>Submit a property claim to add contact details. Public phone display requires approval.</p><a className="review-action" href="/claims/new">Find and claim your property</a></section>}</div></>;
}

export async function NotificationsPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const Heading = embedded ? "h2" : "h1";

  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("get_my_notifications");
  if (error) throw new Error("Notifications unavailable");
  const rows = data as Notification[];
  return (
    <>
      <Heading>Your notifications</Heading>
      <p>
        Recent private activity: verification, claims, representative replies
        and moderation. The latest 100 notifications are shown.
      </p>
      {!rows.length && <p>No notifications yet.</p>}
      {rows.map((n) => (
        <NotificationCard key={n.id} notification={n} />
      ))}
      {!embedded && <p>
        <a href="/account">Back to your account</a>
      </p>}
    </>
  );
}

export async function PasswordPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const Heading = embedded ? "h2" : "h1";

  return (
    <>
      <Heading>Choose a new password</Heading>
      <PasswordForm />
      {!embedded && <p>
        <a href="/account">Back to your account</a>
      </p>}
    </>
  );
}

export async function AccountPrivacyPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const Heading = embedded ? "h2" : "h1";

  return (
    <>
      <Heading>Account privacy and deletion</Heading>
      <DeleteAccountForm />
      {!embedded && <p>
        <a href="/account">Keep my account</a>
      </p>}
    </>
  );
}
