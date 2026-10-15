"use client";
import { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function NavigationPending() {
  const { pending } = useLinkStatus();
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const timer=setTimeout(()=>setVisible(pending),pending?300:0);
    return()=>clearTimeout(timer);
  },[pending]);
  return pending&&visible?createPortal(<div className="navigation-loading-backdrop"><div className="navigation-loading-card" role="status" aria-live="polite"><span className="navigation-loading-spinner" aria-hidden="true"/><strong>Loading page…</strong></div></div>,document.body):null;
}
