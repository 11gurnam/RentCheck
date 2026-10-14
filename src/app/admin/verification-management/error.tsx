"use client";
import { useTransition } from "react";
import { AccountFrame } from "@/components/ui/account-frame";
export default function ManagementError({ retry }: { retry: () => void }) {
  const [pending, start] = useTransition();
  return <AccountFrame><section className="dashboard-card"><h1>Verification Management</h1><p role="alert">We couldn’t load these applications. Your access or the service may have changed.</p><button className="button" disabled={pending} onClick={() => start(() => retry())}>{pending ? "Trying again…" : "Try again"}</button><p><a href="/admin">Return to administrator home</a></p></section></AccountFrame>;
}
