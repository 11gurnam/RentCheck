"use client";
import { useState } from "react";
import type { OwnReview } from "./validation";
import { DeleteReview, CloseTenancy } from "./forms";
import { CalendarFilter } from "./calendar-filter";
import { CameraIcon } from "@/components/ui/camera-icon";
import { ReviewScoreBadges } from "./score-badges";
import { StatusBadge, ActionIcon } from "@/components/ui/action-feedback";
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
}
export function ReviewCollection({ rows }: { rows: OwnReview[] }) {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const invalidRange = !!from && !!to && from > to;
  const filtered = rows.filter(r =>
    `${r.property_name} ${r.body}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (!from || !r.end || r.end >= from) && (!to || r.start <= to) &&
    (!status || r.status === status)
  ).sort((a, b) => sort === "oldest" ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start));
  const active = query || from || to || status || sort !== "newest";
  return <>
    <div className="reviews-toolbar"><h2>Your stays, at a glance</h2><a className="button" href="/search"><ActionIcon name="edit" />Write a review</a></div>
    <section className="reviews-filters" aria-label="Filter your reviews">
      <label className="review-search">Search reviews<span className="review-search-field"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" placeholder="Find a property or experience…" value={query} onChange={e => setQuery(e.target.value)} /></span></label>
      <CalendarFilter label="Stay from" value={from} onChange={setFrom} />
      <CalendarFilter label="Stay to" value={to} onChange={setTo} />
      <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{Array.from(new Set(rows.map(r => r.status))).map(s => <option key={s} value={s}>{s === "visible" ? "Published" : s.replaceAll("_", " ")}</option>)}</select></label>
      <label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest stay first</option><option value="oldest">Oldest stay first</option></select></label>
      {active && <button className="review-action" onClick={() => { setQuery(""); setFrom(""); setTo(""); setStatus(""); setSort("newest"); }}>Clear filters</button>}
    </section>
    {invalidRange ? <p role="alert">Choose an end date on or after the start date.</p> : <>
      <p className="field-hint" role="status">{filtered.length} of {rows.length} reviews</p>
      {!filtered.length && <section className="dashboard-card"><h2>{rows.length ? "No matching reviews" : "No reviews yet"}</h2><p>{rows.length ? "Try another search or clear your filters." : "Find a place to share your first experience."}</p></section>}
      {filtered.map(r => <section key={r.id} className="dashboard-card own-review-card">
        <div className="own-review-heading"><div className="own-review-name"><span className="review-house" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m3 10 9-7 9 7v11H3V10Z"/><path d="M9 21v-8h6v8"/></svg></span><h2>{r.archived ? r.property_name : <a href={`/properties/${r.property_id}`}>{r.property_name}</a>}</h2></div><span className="review-status"><StatusBadge status={r.status}>{r.status === "visible" ? "Published" : r.status.replaceAll("_", " ")}</StatusBadge></span></div>
        <div className="review-dates"><span className="review-date-caption">Tenancy</span><div className="review-date-range"><time dateTime={r.start}>{dateLabel(r.start)}</time><span className="review-date-arrow" aria-label="to">→</span>{r.end ? <time dateTime={r.end}>{dateLabel(r.end)}</time> : <span>Current</span>}</div></div>
        <ReviewScoreBadges overall={r.propertyRating} criteria={r.criteria} />
        <div className="review-highlights review-secondary-highlights">{r.managerRating != null && <span>Management {r.managerRating}/5</span>}{r.recommend != null && <span>{r.recommend ? "Would recommend" : "Would not recommend"}</span>}</div>
        {!!r.criteria?.length && <details className="review-criterion-details"><summary>All criterion ratings</summary><div className="review-criteria-scores">{r.criteria.map(c => <span key={c.key}>{c.label}<strong>{c.rating} / 5</strong></span>)}</div></details>}
        <p className="review-excerpt">{r.body.length > 180 ? r.body.slice(0, 177).trimEnd() + "…" : r.body}</p>
        {r.body.length > 180 && <details className="review-full-text"><summary>Read full review</summary><p>{r.body}</p></details>}
        {r.status === "visible" ? <div className="review-actions"><a className="review-action" href={`/reviews/${r.id}/edit`}><ActionIcon name="edit" />Edit review</a><a className="review-action camera-action" href={`/reviews/${r.id}/edit#review-photos`}><CameraIcon />Photos</a><DeleteReview id={r.id} /></div> : r.archived ? <p>Archived duplicate tenancy retained for audit.</p> : <CloseTenancy review={r} />}
      </section>)}
    </>}
  </>;
}
