"use client";
import { useId, useState, useRef, type ReactNode } from "react";
import { ActionIcon } from "@/components/ui/action-feedback";
import { accommodationTypes, type Filters } from "./filters";
import { voiceQuery, type SearchLocation } from "./voice-query";
import { useVoiceSearch } from "./use-voice-search";

type SearchDraft = Pick<Filters, "q" | "state" | "city" | "locality" | "type">;
const sorted = (values: string[]) => [...new Set(values)].sort();

export function SearchControls({ initial, locations, children, otherFilterCount }: {
  initial: SearchDraft;
  locations: SearchLocation[];
  children: ReactNode;
  otherFilterCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const panel = useId();
  const voiceStatus = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const states = sorted(locations.map(location => location.state));
  const stateLocations = locations.filter(location => !draft.state || location.state === draft.state);
  const cities = sorted(stateLocations.map(location => location.city));
  const localities = sorted(stateLocations.filter(location => location.city === draft.city).map(location => location.locality));
  const activeCount = otherFilterCount + [draft.state, draft.city, draft.locality, draft.type].filter(Boolean).length;
  const voice = useVoiceSearch(transcript => {
    const values = voiceQuery(transcript, locations, draft);
    setDraft(previous => ({ ...previous, ...values }));
    const selected = [values.locality, values.city, values.state, values.type].filter(Boolean).join(", ");
    return selected ? `Voice search filled ${selected}. Review the fields before searching.` : "Voice search filled the search text. Review it before searching.";
  });
  const listening = voice.phase === "listening";
  const requesting = voice.phase === "requesting";
  const processing = voice.phase === "processing";
  const voiceLabel = listening ? "Stop listening" : requesting ? "Cancel voice search" : "Search using voice";

  function selectState(state: string) {
    setDraft(previous => {
      const matching = locations.filter(location => (!state || location.state === state) && location.city === previous.city);
      return {
        ...previous, state,
        city: matching.length ? previous.city : "",
        locality: matching.some(location => location.locality === previous.locality) ? previous.locality : "",
      };
    });
  }

  return <form action="/search" method="get" className="discovery-search-controls">
    <div className="discovery-search-bar">
      <div className="search-field">
        <label htmlFor="q">Property, address or manager</label>
        <div className="discovery-search-input">
          <ActionIcon name="search"/>
          <input id="q" name="q" type="search" value={draft.q} placeholder="Search property, address or manager…" maxLength={120}
            onChange={event => setDraft({ ...draft, q: event.target.value })}/>
          <button type="button" className="voice-search-button" aria-label={voiceLabel} title={voiceLabel}
            aria-describedby={voiceStatus} data-listening={listening} disabled={processing}
            onClick={listening || requesting ? voice.stop : voice.start}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              {listening ? <rect x="7" y="7" width="10" height="10" rx="2"/> : <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-3 0h6"/></>}
            </svg>
          </button>
        </div>
      </div>
      <button type="submit" className="button discovery-search-submit"><ActionIcon name="search" />Search</button>
      <button type="button" className="discovery-filter-toggle" aria-label="Filters" aria-haspopup="dialog" aria-expanded={open} aria-controls={panel} onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/></svg>
        <span>Filters</span>{activeCount > 0 && <span className="filter-count">{activeCount}<span className="sr-only"> active filters</span></span>}
      </button>
    </div>
    <p id={voiceStatus} role="status" className={voice.message ? "field-hint voice-search-status" : "sr-only"}>{voice.message}</p>
    <dialog ref={dialog} id={panel} className="discovery-filter-dialog" aria-labelledby={`${panel}-title`} onClose={() => setOpen(false)}>
      <div className="discovery-filter-dialog-heading"><h2 id={`${panel}-title`}>Filter places</h2><button type="button" aria-label="Close filters" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="filter-panel discovery-extra-filters">
        <div>
          <label htmlFor="state">State / union territory</label>
          <select id="state" name="state" value={draft.state} onChange={event => selectState(event.target.value)}>
            <option value="">All states</option>
            {sorted([...states, draft.state].filter(Boolean)).map(value => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="city">City</label>
          <select id="city" name="city" value={draft.city} onChange={event => setDraft({ ...draft, city: event.target.value, locality: "" })}>
            <option value="">All cities</option>
            {sorted([...cities, draft.city].filter(Boolean)).map(value => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="locality">Locality</label>
          <select id="locality" name="locality" value={draft.locality} disabled={!draft.city}
            onChange={event => setDraft({ ...draft, locality: event.target.value })}>
            <option value="">All localities</option>
            {sorted([...localities, draft.locality].filter(Boolean)).map(value => <option key={value}>{value}</option>)}
          </select>
          {!draft.city && <small>Choose a city to see its localities.</small>}
        </div>
        <div>
          <label htmlFor="type">Accommodation type</label>
          <select id="type" name="type" value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as Filters["type"] })}>
            <option value="">All types</option>
            {accommodationTypes.map(value => <option key={value}>{value}</option>)}
          </select>
        </div>
        {children}
      </div>
    </dialog>
  </form>;
}
