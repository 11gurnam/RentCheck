"use client";
import { useLinkStatus } from "next/link";

export function NavigationPending() {
  const { pending } = useLinkStatus();
  return <span className={`navigation-pending${pending ? " is-pending" : ""}`} role="status"><span className="sr-only">{pending ? "Loading page…" : ""}</span></span>;
}
