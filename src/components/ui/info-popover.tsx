"use client";
import { useId, useState } from "react";
export function InfoPopover({ label, children }: { label:string; children:React.ReactNode }) {
  const id=useId();
  const [pinned,setPinned]=useState(false),[expanded,setExpanded]=useState(false);
  const show=()=>{const panel=document.getElementById(id);if(panel&&!panel.matches(":popover-open"))panel.showPopover();};
  const hide=()=>{const panel=document.getElementById(id);if(panel?.matches(":popover-open"))panel.hidePopover();};
  return <span className="info-popover"><button type="button" className="info-trigger" aria-label={label} aria-describedby={id} aria-controls={id} aria-expanded={expanded} onMouseEnter={()=>{if(window.matchMedia("(hover: hover)").matches)show();}} onMouseLeave={()=>{if(!pinned)hide();}} onFocus={show} onBlur={()=>{if(!pinned)hide();}} onClick={()=>{if(pinned){hide();setPinned(false);}else{show();setPinned(true);}}}>i</button><span id={id} popover="auto" role="tooltip" className="info-content" onToggle={event=>{const open=(event.nativeEvent as ToggleEvent).newState==="open";setExpanded(open);if(!open)setPinned(false);}}>{children}</span></span>;
}
