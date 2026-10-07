"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function NavigationIcon({ href }: { href: string }) {
  const paths: Record<string, string> = {
    "/search": "M21 21l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    "/saved": "M12 20l-8-8C-2 5 7 0 12 7c5-7 14-2 8 5Z",
    "/account/reviews": "M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2ZM7 8h10M7 12h7",
    "/claims": "M12 3l8 4v6c0 5-8 9-8 9s-8-4-8-9V7ZM8 12l3 3 5-6",
    "/properties/new": "M3 11l9-8 9 8M5 10v11h14V10M9 15h6M12 12v6",
    "/account": "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",
    "/sign-in": "M14 3h6v18h-6M3 12h12M10 7l5 5-5 5",
    "#how-it-works": "M5 5h14v14H5ZM8 9h8M8 13h5",
    "#our-principles": "M12 3l8 4v6c0 5-8 9-8 9s-8-4-8-9V7ZM8 12l3 3 5-6",
  };
  return (
    <svg className="navigation-icon" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      {paths[href] ? <path d={paths[href]} /> : <>
        <circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" />
      </>}
    </svg>
  );
}

export function SiteNavigation({ links }: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pathname = usePathname();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    const closeOnScroll = () => setOpen(false);
    window.addEventListener("scroll", closeOnScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("scroll", closeOnScroll);
    };
  }, [open]);
  return (
    <div ref={container} className="navigation-container" onKeyDown={(event) => {
      if (event.key === "Escape") {
        setOpen(false);
        event.currentTarget.querySelector("button")?.focus();
      }
    }}>
      <button className="menu-toggle" type="button" aria-label="Menu" aria-expanded={open}
        aria-controls={id} onClick={() => setOpen(!open)}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d={open ? "M5 5l10 10M15 5L5 15" : "M3 5h14M3 10h14M3 15h14"}
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <nav id={id} className={`site-navigation${open ? " is-open" : ""}`} aria-label="Main navigation">
        {links.map(({ href, label }) => (
          <a key={href} href={href} aria-current={pathname === href ? "page" : undefined}
            className={href === "/sign-in" ? "navigation-sign-in" : undefined}
            onClick={() => setOpen(false)}>
            <NavigationIcon href={href} /><span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
