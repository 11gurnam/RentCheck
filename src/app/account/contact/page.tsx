import {AccountShell} from "@/components/ui/account-shell";
import {requireUser} from "@/lib/auth/session";
import {createDatabaseClient} from "@/lib/database/server";
import {PhoneContactForm} from "@/features/messaging/phone-form";
import {ContactPreference} from "@/features/messaging/forms";
export default async function ContactSettingsPage(){
 await requireUser("/account/contact");
 const db=await createDatabaseClient();
 const [phone,messages]=await Promise.all([db.rpc("get_my_property_contact_settings"),db.rpc("get_contact_preference")]);
 if(phone.error||messages.error)throw new Error("Contact settings unavailable");
 const settings=phone.data as {phone:string;show_publicly:boolean;has_claim:boolean;approved:boolean};
 return <AccountShell><div className="contact-settings-page"><a className="text-link" href="/account">← Your account</a><header><p className="eyebrow">YOUR CONTACT PREFERENCES</p><h1>Contact settings</h1><p>Choose how tenants can reach you about your properties.</p></header>{settings.has_claim?<><section className="dashboard-card"><h2>Property contact number</h2><PhoneContactForm phone={settings.phone} showPublicly={settings.show_publicly} approved={settings.approved}/></section><section className="dashboard-card"><h2>Messages from tenants</h2><p className="field-hint">Allow in-app enquiries for properties covered by approved claims. Your mobile number is not shared through messages.</p><ContactPreference enabled={messages.data}/></section></>:<section className="dashboard-card"><h2>Represent a property?</h2><p>Submit a property claim to add contact details. Public phone display requires approval.</p><a className="review-action" href="/claims/new">Find and claim your property</a></section>}</div></AccountShell>;
}
