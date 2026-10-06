import { Brand } from "./brand";

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header shell">
        <Brand />
        <nav className="account-nav" aria-label="Main navigation">
          <a href="/search">Explore</a>
          <a href="/saved">Shortlist</a>
          <a href="/account/reviews">Your reviews</a>
          <a href="/properties/new">Add a place</a>
          <a href="/account">Your account</a>
          <a className="text-link" href="/">
            About RentCheck
          </a>
        </nav>
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
