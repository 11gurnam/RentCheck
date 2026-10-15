"use client";
import { useId, useState } from "react";
export function InfoPopover({ label, children }: { label:string; children:React.ReactNode }) {
  const id=useId();
  const [pinned,setPinned]=useState(false),[expanded,setExpanded]=useState(false);
  const show=()=>{const panel=document.getElementById(id);if(panel&&!panel.matches(":popover-open"))panel.showPopover();};
  const hide=()=>{const panel=document.getElementById(id);if(panel?.matches(":popover-open"))panel.hidePopover();};
  return <span className="info-popover"><button type="button" className="info-trigger" aria-label={label} aria-describedby={id} aria-controls={id} aria-expanded={expanded} onMouseEnter={()=>{if(window.matchMedia("(hover: hover)").matches)show();}} onMouseLeave={()=>{if(!pinned)hide();}} onFocus={show} onBlur={()=>{if(!pinned)hide();}} onClick={()=>{if(pinned){hide();setPinned(false);}else{show();setPinned(true);}}}><svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1" strokeLinecap="round"/></svg></button><span id={id} popover="auto" role="tooltip" className="info-content" onToggle={event=>{const open=(event.nativeEvent as ToggleEvent).newState==="open";setExpanded(open);if(!open)setPinned(false);}}>{children}</span></span>;
}
