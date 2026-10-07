import { getVerifiedUser } from "@/lib/auth/session";
import { Brand } from "./brand";
import { SiteNavigation } from "./site-navigation";

export async function SiteHeader({ home = false }: { home?: boolean }) {
  const user = await getVerifiedUser();
  const links = [
    { href: "/search", label: "Explore" },
    ...(user ? [
      { href: "/saved", label: "Shortlist" },
      { href: "/account/reviews", label: "Your reviews" },
      { href: "/claims", label: "Your claims" },
      { href: "/properties/new", label: "Add a place" },
      { href: "/account", label: "Your account" },
    ] : []),
    ...(home ? [
      { href: "#how-it-works", label: "How it works" },
      ...(!user ? [{ href: "#our-principles", label: "Our principles" }] : []),
    ] : [{ href: "/", label: "About RentCheck" }]),
    ...(!user ? [{ href: "/sign-in", label: "Sign in" }] : []),
  ];
  return (
    <header className="site-header shell">
      <Brand href={home ? "#top" : "/#top"} />
      <SiteNavigation links={links} />
    </header>
  );
}
