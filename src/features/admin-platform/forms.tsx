"use client";
import { useFeedbackAction } from "@/components/ui/use-feedback-action";
import { useRef, useState } from "react";
import { ActionModal } from "@/components/ui/action-modal";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { platformAction, submitAppeal, respondCase } from "./actions";
export function AdminAction({kind,id,options,label="Manage record"}:{kind:string;id:string;options:[string,string][];label?:string}) {
  const [state,action,pending]=useFeedbackAction(platformAction,{});
  const [selected,setSelected]=useState(options[0]?.[0]??"");
  const form=useRef<HTMLFormElement>(null);
  if(!options.length)return null;
  return <ActionModal title={label} trigger={label} warning={options.some(([value])=>["removed","hidden","suspended","open_case"].includes(value))}><form action={action} ref={form} className="auth-form"><input type="hidden" name="kind" value={kind}/><input type="hidden" name="target" value={id}/><label>Action<select name="action" value={selected} onChange={e=>setSelected(e.target.value)}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label><label>{selected==="note" ? "Private internal note" : "Reason"}<textarea name="reason" required minLength={10} maxLength={2000}/></label><p className="field-hint">{selected==="note" ? "This note is private to administrators." : "Reasons are audited and may be shared with the affected account. Preserve legitimate criticism; use temporary hiding when a review needs investigation."}</p><ActionModal title="Confirm administrative action" trigger="Review action" beforeOpen={()=>form.current?.reportValidity()??false} warning={selected!=="note"}><p>Confirm this change and its reason. {selected==="removed"&&"Permanent removal cannot be undone."}</p><button type="submit" disabled={pending}>{pending?"Saving…":"Confirm and save"}</button><ActionFeedback receipt={state} message={state.message} status={state.status}/></ActionModal><ActionFeedback receipt={state} message={state.message} status={state.status}/></form></ActionModal>;
}
export function AppealForm({target,kind,label="Report or appeal",records}:{target?:string;kind?:string;label?:string;records?:{id:string;kind:string;label:string}[]}) {
  const [state,action,pending]=useFeedbackAction(submitAppeal,{});
  const [selected,setSelected]=useState(records?.[0]?`${records[0].kind}:${records[0].id}`:"");
  const [selectedKind,selectedId]=selected.split(":");
  return <ActionModal title={label} trigger={label} warning><form className="auth-form" action={action}>{records?<><label>Your record<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a review, claim or verification</option>{records.map(record=><option key={`${record.kind}:${record.id}`} value={`${record.kind}:${record.id}`}>{record.label}</option>)}</select></label><input type="hidden" name="kind" value={selectedKind??""}/><input type="hidden" name="target" value={selectedId??""}/></>:<>{kind?<input type="hidden" name="kind" value={kind}/>:<label>Record type<select name="kind"><option value="tenant">My residence verification</option><option value="landlord">My property claim</option><option value="review">My review</option><option value="property">A property listing</option></select></label>}{target?<input type="hidden" name="target" value={target}/>:<label>Record ID<input name="target" required placeholder="Verification, claim, review or property UUID"/></label>}</>}<label>Explain your report or appeal<textarea name="reason" required minLength={10} maxLength={2000}/></label><button disabled={pending}>{pending?"Sending…":"Submit for review"}</button><ActionFeedback receipt={state} message={state.message} status={state.status}/></form></ActionModal>;
}
export function CaseResponse({id}:{id:string}) {
  const [state,action,pending]=useFeedbackAction(respondCase,{});
  return <form action={action} className="auth-form"><input type="hidden" name="target" value={id}/><label>Your clarification<textarea name="reason" required minLength={10} maxLength={2000}/></label><button disabled={pending}>Send clarification</button><ActionFeedback receipt={state} message={state.message} status={state.status}/></form>;
}
