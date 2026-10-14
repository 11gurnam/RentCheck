import { Brand } from "./brand";
import { SiteNavigation } from "./site-navigation";

// Error boundaries can use this frame even when the account service fails.
export function AccountFrame({ children, header }: {
  children: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      {header ?? (
        <header className="site-header shell">
          <Brand />
          <SiteNavigation links={[
            { href: "/search", label: "Explore" },
            { href: "/", label: "About RentCheck" },
            { href: "/sign-in", label: "Sign in" },
          ]} />
        </header>
      )}
      <main id="main" className="account-shell shell">{children}</main>
      <footer className="site-footer shell">
        <Brand />
        <p>Made for a more informed move.</p>
        <span>Accommodation research across India</span>
      </footer>
    </>
  );
}
