"use client";
import { AccountFrame as AccountShell } from "@/components/ui/account-frame";
import { useTransition } from "react";
export default function ErrorPage({ retry }: { retry: () => void }) {
  const [pending, startRetry] = useTransition();
  return (
    <AccountShell>
      <section className="dashboard-card boundary-card">
        <h1>We couldn’t load this page.</h1>
        <p role="alert">
          Your connection or the service may be temporarily unavailable. Try
          again, or return to Explore.
        </p>
        <button
          className="button"
          disabled={pending}
          onClick={() => startRetry(() => retry())}
        >
          {pending ? "Trying again…" : "Try again"}
        </button>
        <p>
          <a href="/search">Return to Explore</a>
        </p>
      </section>
    </AccountShell>
  );
}
