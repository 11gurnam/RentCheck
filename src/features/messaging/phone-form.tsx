"use client";
import {useState} from "react";
import {useFeedbackAction} from "@/components/ui/use-feedback-action";
import {ActionFeedback,ActionIcon} from "@/components/ui/action-feedback";
import {savePhoneContact} from "./actions";
export function PhoneContactForm({phone,showPublicly,approved}:{phone:string;showPublicly:boolean;approved:boolean}) {
 const [number,setNumber]=useState(phone),[visible,setVisible]=useState(showPublicly&&approved);
 const [state,action,pending]=useFeedbackAction(savePhoneContact,{});
 return <form action={action} className="auth-form phone-contact-form">
  <label>Contact mobile number<input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} placeholder="10-digit mobile number or +91…" value={number} onChange={event=>{setNumber(event.target.value);if(!event.target.value.trim())setVisible(false);}} aria-describedby="phone-privacy-help"/></label>
  <p id="phone-privacy-help" className="field-hint">Optional. Your number stays private unless you enable public display. Clear the field and save to remove it.</p>
  <label className="checkbox-row"><input name="showPublicly" type="checkbox" checked={visible} disabled={!approved||!number.trim()} onChange={event=>setVisible(event.target.checked)}/>Display this number publicly on properties with my approved claims</label>
  {!approved&&<p className="field-hint">You can save your number now. Public display becomes available after a property claim is approved.</p>}
  <button type="submit" disabled={pending}><ActionIcon name="save"/>{pending?"Saving…":"Save contact details"}</button>
  <ActionFeedback receipt={state} message={state.message} status={state.status}/>
 </form>;
}
