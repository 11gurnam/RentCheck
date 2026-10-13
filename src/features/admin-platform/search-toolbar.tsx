import Link from "next/link";
import type { ReactNode } from "react";
import { ActionModal } from "@/components/ui/action-modal";

export function activeFilterCount(values: Record<string, unknown>) {
  return Object.entries(values).filter(([key, value]) => !["q", "page", "id"].includes(key) && value != null && value !== "" && !(key === "sort" && value === "newest")).length;
}

export function AdminSearchToolbar({ action, query, title, count, children, placeholder, searchLabel = "Search" }: {
  action: string; query: string; title: string; count: number; children: ReactNode; placeholder: string; searchLabel?: string;
}) {
  const reset = query ? `${action}?${new URLSearchParams({ q: query })}` : action;
  return <div className="admin-search-panel">
    <form action={action} method="get" className="admin-search-toolbar">
      <label className="admin-search-field"><span className="sr-only">{searchLabel}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
        <input type="search" name="q" defaultValue={query} maxLength={120} placeholder={placeholder}/>
      </label>
      <button className="button admin-search-submit" type="submit">Search</button>
      <ActionModal title={title} trigger="Filters" triggerClassName="admin-filter-trigger" dialogClassName="admin-filter-dialog" triggerContent={<><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6M16 9v6M10 15v6"/></svg><span>Filters</span>{count > 0 && <span className="admin-filter-count">{count}</span>}</>}>
        <p className="field-hint">Narrow the results. Your search stays in place when you apply filters.</p>
        <div className="admin-filter-fields">{children}</div>
        <footer className="admin-filter-footer"><Link className="review-action" href={reset}>Clear filters</Link><button type="submit" className="button">Apply filters</button></footer>
      </ActionModal>
    </form>
    {count > 0 && <div className="admin-active-filters"><span>{count} {count === 1 ? "filter" : "filters"} applied</span><Link href={reset}>Clear filters</Link></div>}
  </div>;
}
