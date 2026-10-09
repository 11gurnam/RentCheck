"use client";
import { useId, useRef, useState } from "react";
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function CalendarFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(() => (value || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })).slice(0, 7));
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const shift = (amount: number) => setMonth(new Date(Date.UTC(year, monthNumber - 1 + amount, 1)).toISOString().slice(0, 7));
  return <div className="calendar-filter"><span id={id}>{label}</span>
    <button type="button" className="calendar-trigger" aria-labelledby={id} aria-haspopup="dialog" onClick={() => { if (value) setMonth(value.slice(0, 7)); dialog.current?.showModal(); }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/></svg>{value ? `${value.slice(8)} ${months[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}` : "Any date"}</button>
    <dialog ref={dialog} className="filter-calendar" aria-label={`Choose ${label.toLowerCase()} date`}>
      <div className="calendar-top"><h3>{label}</h3><button type="button" aria-label="Close calendar" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="calendar-navigation"><button type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button><div><select aria-label="Month" value={monthNumber} onChange={e => setMonth(`${year}-${e.target.value.padStart(2, "0")}`)}>{months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select><select aria-label="Year" value={year} onChange={e => setMonth(`${e.target.value}-${String(monthNumber).padStart(2, "0")}`)}>{Array.from({ length: 151 }, (_, i) => 1950 + i).map(y => <option key={y}>{y}</option>)}</select></div><button type="button" aria-label="Next month" onClick={() => shift(1)}>›</button></div>
      <div className="calendar-grid">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => <span key={d}>{d}</span>)}{Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: days }, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, "0")}`; return <button key={date} type="button" aria-label={`${i + 1} ${months[monthNumber - 1]} ${year}`} aria-pressed={date === value} onClick={() => { onChange(date); dialog.current?.close(); }}>{i + 1}</button>; })}</div>
      <button type="button" className="review-action" onClick={() => { onChange(""); dialog.current?.close(); }}>Clear date</button>
    </dialog>
  </div>;
}
