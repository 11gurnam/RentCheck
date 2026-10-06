"use client";
import { AccountShell } from "@/components/ui/account-shell";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, retry] = useTransition();
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
          onClick={() =>
            retry(() => {
              router.refresh();
              reset();
            })
          }
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
