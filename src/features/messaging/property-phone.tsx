import {createDatabaseClient} from "@/lib/database/server";
export async function PropertyPhoneContact({property}:{property:string}){
 const {data,error}=await (await createDatabaseClient()).rpc("get_property_contact_numbers",{p_property:property});
 if(error)return <p className="field-hint">Phone contact is temporarily unavailable.</p>;
 return (data as {alias:string;phone:string}[]).map(contact=><div className="property-phone-contact" key={`${contact.alias}-${contact.phone}`}><div><small>Public contact number</small><strong>{contact.alias}</strong></div><a className="review-action" href={`tel:${contact.phone}`} aria-label={`Call ${contact.alias} on ${contact.phone}`}><svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m5 3 4 1 1 5-3 2a15 15 0 0 0 6 6l2-3 5 1 1 4c-1 4-7 2-12-3S2 4 5 3Z"/></svg>{contact.phone}</a></div>);
}
