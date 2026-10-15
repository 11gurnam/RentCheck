"use client";
import {useEffect,useId,useRef,useState,useSyncExternalStore} from "react";
import Link from "next/link";
import {ActionIcon} from "@/components/ui/action-feedback";
import {NavigationPending} from "@/components/ui/navigation-pending";
const subscribe=()=>()=>{};

export function VerificationRowActions({href,name,actionable,own=false}:{href:string;name:string;actionable:boolean;own?:boolean}) {
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [open,setOpen]=useState(false);
 const pinned=useRef(false);
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(!trigger.current?.contains(event.target as Node)&&!panel.current?.contains(event.target as Node)&&panel.current?.matches(":popover-open"))panel.current.hidePopover();};
  const other=(event:Event)=>{if((event as CustomEvent).detail!==id&&panel.current?.matches(":popover-open"))panel.current.hidePopover();};
  document.addEventListener("pointerdown",outside);document.addEventListener("verification-menu-open",other);
  return()=>{if(timer.current)clearTimeout(timer.current);document.removeEventListener("pointerdown",outside);document.removeEventListener("verification-menu-open",other);};
 },[id]);
 function show(){
  if(timer.current)clearTimeout(timer.current);
  const button=trigger.current,popup=panel.current;if(!button||!popup)return;
  document.dispatchEvent(new CustomEvent("verification-menu-open",{detail:id}));
  if(!popup.matches(":popover-open"))popup.showPopover();
  const rect=button.getBoundingClientRect(),height=popup.offsetHeight,width=popup.offsetWidth;
  popup.style.left=`${Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8))}px`;
  popup.style.top=`${rect.bottom+height+8>window.innerHeight?Math.max(8,rect.top-height-6):rect.bottom+6}px`;
 }
 function hide(){if(panel.current?.matches(":popover-open"))panel.current.hidePopover();}
 function leave(){if(!pinned.current)timer.current=setTimeout(hide,180);}
 return <div className="verification-row-actions" onKeyDown={event=>{if(event.key==="Escape"){hide();trigger.current?.focus();}}}>
  <button ref={trigger} type="button" disabled={!hydrated} className="review-action verification-actions-trigger" aria-label={`Actions for ${name}`} aria-controls={id} aria-expanded={open} onMouseEnter={()=>{if(window.matchMedia("(hover:hover)").matches)show();}} onMouseLeave={leave} onClick={()=>{if(pinned.current){pinned.current=false;hide();}else{pinned.current=true;show();}}}>
   <svg className="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
  </button>
  <div ref={panel} id={id} popover="manual" className="verification-actions-popover" aria-label={`Application actions for ${name}`} onMouseEnter={()=>{if(timer.current)clearTimeout(timer.current);}} onMouseLeave={leave} onToggle={event=>{const visible=(event.nativeEvent as ToggleEvent).newState==="open";setOpen(visible);if(!visible)pinned.current=false;}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)&&event.relatedTarget!==trigger.current)hide();}}>
   <Link href={href} onClick={hide}><ActionIcon name="search"/>View Details<NavigationPending/></Link>
   {actionable&&<>{!own&&<Link className="decision-approve" href={`${href}?action=approved`} onClick={hide}><ActionIcon name="check"/>Approve application<NavigationPending/></Link>}<Link className="decision-reject" href={`${href}?action=rejected`} onClick={hide}><ActionIcon name="close"/>Reject application<NavigationPending/></Link><Link className="decision-information" href={`${href}?action=request_information`} onClick={hide}><ActionIcon name="edit"/>Request more information<NavigationPending/></Link></>}
  </div>
 </div>;
}
