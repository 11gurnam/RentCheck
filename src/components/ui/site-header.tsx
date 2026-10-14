import { ProfileAvatar } from "./profile-avatar";
import { createDatabaseClient } from "@/lib/database/server";
import { getOwnProfile, getVerifiedUser, isAdministrator } from "@/lib/auth/session";
import { Brand } from "./brand";
import { SiteNavigation } from "./site-navigation";

export async function SiteHeader({ home = false }: { home?: boolean }) {
  const user = await getVerifiedUser();
  const profile = user ? await getOwnProfile() : null;
  const admin = user ? await isAdministrator() : false;
  const photo = profile ? await (await createDatabaseClient()).from("public_profiles").select("avatar_url").eq("id",profile.profile_id).maybeSingle() : null;
  const links = admin ? [
    { href: "/search", label: "Explore" },
    { href: "/properties/new", label: "Add a place" },
    { href: "/admin", label: "Admin Dashboard" },
  ] : [
    { href: "/search", label: "Explore" },
    ...(user ? [
      { href: "/saved", label: "Shortlist" },
      { href: "/account/reviews", label: "Your reviews" },
      { href: "/claims", label: "Your claims" },
      { href: "/properties/new", label: "Add a place" },

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
      {user && <a href="/account" className="header-profile-link" title={`${profile?.public_alias ?? "Your account"} · Signed in`} aria-label={`${profile?.public_alias ?? "Your account"} — Your account, signed in`}><ProfileAvatar name={profile?.public_alias ?? "Your account"} src={photo?.data?.avatar_url ?? null} initials /><span className="signed-in-check" aria-hidden="true">✓</span><span className="sr-only">{profile?.public_alias ?? "Your account"}</span></a>}
    </header>
  );
}
