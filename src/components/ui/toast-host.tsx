"use client";
import { useEffect, useState } from "react";

export function notifySuccess(message: string) {
  window.dispatchEvent(new CustomEvent("rentcheck:success", { detail: message }));
}
export function ToastHost() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = (event: Event) => {
      setMessage(String((event as CustomEvent).detail));
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(""), 6000);
    };
    window.addEventListener("rentcheck:success", show);
    const clear=()=>{clearTimeout(timer);setMessage("");};
    window.addEventListener("rentcheck:action-start",clear);
    return () => { clearTimeout(timer); window.removeEventListener("rentcheck:success", show); window.removeEventListener("rentcheck:action-start",clear); };
  }, []);
  return <div className="toast-region" aria-live="polite" aria-atomic="true">{message && <div className="success-toast"><span aria-hidden="true">✓</span><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setMessage("")}>×</button></div>}</div>;
}
