import { Brand } from "./brand";

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header shell">
        <Brand />
        <a className="text-link" href="/">
          About RentCheck
        </a>
      </header>
      <main id="main" className="account-shell shell">
        {children}
      </main>
      <footer className="site-footer shell">
        <Brand />
        <p>Made for a more informed move.</p>
        <span>India · Early prototype</span>
      </footer>
    </>
  );
}
