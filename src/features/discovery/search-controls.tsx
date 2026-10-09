"use client";
import { useId, useState, useRef, type ReactNode } from "react";
import { ActionIcon } from "@/components/ui/action-feedback";

export function SearchControls({ search, children, activeCount }: { search: ReactNode; children: ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  return <form action="/search" method="get" className="discovery-search-controls">
    <div className="discovery-search-bar">
      {search}
      <button type="submit" className="button discovery-search-submit"><ActionIcon name="search" />Search</button>
      <button type="button" className="discovery-filter-toggle" aria-label="Filters" aria-haspopup="dialog" aria-expanded={open} aria-controls={panel} onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/></svg>
        <span>Filters</span>{activeCount > 0 && <span className="filter-count">{activeCount}<span className="sr-only"> active filters</span></span>}
      </button>
    </div>
    <dialog ref={dialog} id={panel} className="discovery-filter-dialog" aria-labelledby={`${panel}-title`} onClose={() => setOpen(false)}>
      <div className="discovery-filter-dialog-heading"><h2 id={`${panel}-title`}>Filter places</h2><button type="button" aria-label="Close filters" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="filter-panel discovery-extra-filters">{children}</div>
    </dialog>
  </form>;
}
