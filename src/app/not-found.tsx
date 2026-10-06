import { AccountShell } from "@/components/ui/account-shell";
export default function NotFound() {
  return (
    <AccountShell>
      <section className="dashboard-card boundary-card">
        <p className="eyebrow">404</p>
        <h1>That page isn’t available.</h1>
        <p>This page could not be found.</p>
        <p>
          The profile may have been archived, or the address may be incomplete.
        </p>
        <a href="/search" className="primary-link">
          Explore accommodation
        </a>
      </section>
    </AccountShell>
  );
}
