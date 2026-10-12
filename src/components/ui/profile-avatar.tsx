"use client";
import Image from "next/image";
import { useState } from "react";

export function ProfileAvatar({ name, src }: { name: string; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  return <span className="profile-avatar">
    {src && !failed ? <Image src={src} width={44} height={44} unoptimized alt={`${name} profile`} onError={() => setFailed(true)} /> :
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" role="img" aria-label={`${name} profile`}><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>}
  </span>;
}
