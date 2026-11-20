"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ActionIcon } from "@/components/ui/action-feedback";
import { money } from "@/features/discovery/filters";
import { WomenRatingIcon } from "@/features/discovery/women-rating-icon";
import { adminNavigation, type AdminContext, type AssistantRole } from "./admin-schema";
import { messageLimit, type AssistantContext, type AssistantProperty, type AssistantReply, type AssistantRequest } from "./schema";
import styles from "./widget.module.css";

type Message = { id: number; question: string } | { id: number; reply: AssistantReply };
type Mode = "closed" | "minimized" | "open";
type Viewer = { role: AssistantRole; viewer: string };
const greetings = {
  user: "Hi! I'm RentWise 👋 I can help you discover properties, understand reviews, and navigate RentCheck.",
  admin: "Hi! I'm RentWise 👋 I can help you monitor RentCheck operations, review pending requests, track complaints, and quickly access administrative sections.",
};
const prompts = {
  user: ["Find properties under ₹10,000", "How does tenant verification work?", "Where are my saved properties?"],
  admin: ["How many approvals are pending?", "Show unresolved complaints", "Show pending tenant verifications"],
};

export function RentCheckAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("closed");
  const [checked, setChecked] = useState<{ pathname: string; role: AssistantRole }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const context = useRef<AssistantContext>(undefined);
  const adminContext = useRef<AdminContext>(undefined);
  const viewer = useRef<Viewer>(undefined);
  const activity = useRef<AbortController>(null);
  const serial = useRef(0);
  const widget = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const role = checked?.pathname === pathname ? checked?.role : undefined;

  useEffect(() => {
    if (mode !== "open") return;
    let controller: AbortController | undefined;
    const checkRole = async () => {
      controller?.abort();
      const check = new AbortController();
      controller = check;
      let next: Viewer = { role: "user", viewer: "guest" };
      try {
        const response = await fetch("/api/assistant", {
          cache: "no-store", signal: AbortSignal.any([check.signal, AbortSignal.timeout(7000)]),
        });
        if (response.ok) {
          const result = await response.json() as Viewer;
          if ((result.role === "admin" || result.role === "user") && typeof result.viewer === "string") next = result;
        }
      } catch {
        if (check.signal.aborted) return;
      }
      if (check.signal.aborted) return;
      if (viewer.current && (viewer.current.role !== next.role || viewer.current.viewer !== next.viewer)) {
        activity.current?.abort();
        activity.current = null;
        adminContext.current = undefined;
        context.current = undefined;
        setMessages([]);
        setDraft("");
        setPending(false);
        setError("");
      }
      viewer.current = next;
      setChecked({ pathname, role: next.role });
    };
    void checkRole();
    window.addEventListener("focus", checkRole);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", checkRole);
    };
  }, [mode, pathname]);

  useEffect(() => {
    if (mode !== "open") return;
    const element = widget.current;
    const viewport = window.visualViewport;
    input.current?.focus({ preventScroll: true });
    if (!viewport || !element) return;
    const fitViewport = () => {
      element.style.setProperty("--chat-viewport-height", `${viewport.height}px`);
      element.style.setProperty("--chat-viewport-gap", `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    };
    fitViewport();
    viewport.addEventListener("resize", fitViewport);
    viewport.addEventListener("scroll", fitViewport);
    return () => {
      viewport.removeEventListener("resize", fitViewport);
      viewport.removeEventListener("scroll", fitViewport);
      element.style.removeProperty("--chat-viewport-height");
      element.style.removeProperty("--chat-viewport-gap");
    };
  }, [mode]);

  useEffect(() => {
    const viewport = log.current;
    if (!viewport) return;
    const last = viewport.lastElementChild;
    if (!pending && !error && last && last.getBoundingClientRect().height > viewport.clientHeight - 16) {
      viewport.scrollTop += last.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 12;
    } else {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, pending, error, mode]);

  function hide(next: Mode) {
    setMode(next);
    requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true }));
  }

  function clear() {
    activity.current?.abort();
    activity.current = null;
    context.current = undefined;
    adminContext.current = undefined;
    setMessages([]);
    setPending(false);
    setDraft("");
    setError("");
    input.current?.focus();
  }

  function append(message: { question: string } | { reply: AssistantReply }) {
    const next = { id: ++serial.current, ...message };
    setMessages(history => [...history.slice(-59), next]);
  }

  function start() {
    const controller = new AbortController();
    activity.current = controller;
    setError("");
    setPending(true);
    return controller;
  }

  async function request(input: Pick<AssistantRequest, "message" | "location">, controller: AbortController) {
    const page = window.location.pathname + window.location.search;
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, context: context.current, adminContext: adminContext.current, page }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
      });
      const result = await response.json() as AssistantReply | { message: string; role?: AssistantRole; viewer?: string };
      if (controller.signal.aborted) return;
      if ((result.role === "admin" || result.role === "user") && typeof result.viewer === "string") {
        const sameAccount = !viewer.current || viewer.current.viewer === result.viewer;
        if (!sameAccount || (viewer.current && viewer.current.role !== result.role)) {
          setMessages([]);
          adminContext.current = undefined;
          context.current = undefined;
        }
        viewer.current = { role: result.role, viewer: result.viewer };
        setChecked({ pathname: window.location.pathname, role: result.role });
        if (!sameAccount) return;
      }
      if ("message" in result) {
        setError(result.message);
        if (input.message) setDraft(current => current || input.message!);
      } else if (response.ok && result.text) {
        context.current = result.context;
        adminContext.current = result.role === "admin" ? result.adminContext : undefined;
        append({ reply: result });
        const currentPage = window.location.pathname + window.location.search;
        if (result.role === "admin" && currentPage === page && result.navigate && adminNavigation.test(result.navigate)) {
          hide("minimized");
          router.push(result.navigate);
        } else if (window.location.pathname === "/search" && currentPage === page &&
          result.searchHref && /^\/search(?:\?|$)/.test(result.searchHref) && result.searchHref !== currentPage) {
          router.push(result.searchHref, { scroll: false });
        }
      } else {
        throw new Error("Assistant unavailable");
      }
    } catch {
      if (!controller.signal.aborted) {
        setError("I couldn’t connect. Try sending your message again.");
        if (input.message) setDraft(current => current || input.message!);
      }
    } finally {
      if (activity.current === controller) {
        activity.current = null;
        setPending(false);
      }
    }
  }

  function send(value = draft) {
    const message = value.trim();
    if (!message || activity.current || !role) return;
    setDraft("");
    append({ question: message });
    void request({ message }, start());
  }

  function useLocation() {
    if (activity.current) return;
    if (!navigator.geolocation) {
      append({ reply: { text: "Location is unavailable here. Type your city or locality to keep looking." } });
      input.current?.focus();
      return;
    }
    const controller = start();
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (controller.signal.aborted) return;
      append({ question: "Use my approximate location." });
      void request({ location: {
        latitude: Number(coords.latitude.toFixed(2)),
        longitude: Number(coords.longitude.toFixed(2)),
      } }, controller);
    }, () => {
      if (controller.signal.aborted) return;
      activity.current = null;
      setPending(false);
      append({ reply: { text: "I couldn’t access your location. Type a city or locality and I’ll look there." } });
      input.current?.focus();
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 60000 });
  }

  const minimize = () => hide("minimized");
  return (
    <div ref={widget} className={styles.widget} onKeyDown={event => {
      if (event.key === "Escape" && mode === "open") {
        event.stopPropagation();
        minimize();
      }
    }}>
      {mode === "open" ? (
        <section className={styles.panel} aria-labelledby="rentcheck-assistant-title">
          <header className={styles.header}>
            <ChatIcon />
            <h2 id="rentcheck-assistant-title">RentWise</h2>
            <div className={styles.controls}>
              <button type="button" onClick={minimize} aria-label="Minimize assistant">
                <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
              </button>
              <button type="button" onClick={() => hide("closed")} aria-label="Close assistant"><ActionIcon name="close" /></button>
            </div>
          </header>
          <div className={styles.log} ref={log} role="log" aria-label="Chat messages">
            {role && <p className={styles.bubble}>{greetings[role]}</p>}
            {role && !messages.length && (
              <div className={styles.prompts} aria-label="Suggested questions">
                {prompts[role].map(prompt => <button key={prompt} type="button" className={styles.link}
                  onClick={() => send(prompt)} disabled={pending}>{prompt}</button>)}
              </div>
            )}
            {role && messages.map(message => "question" in message ? (
              <p key={message.id} className={styles.question}><span className="sr-only">You: </span>{message.question}</p>
            ) : message.reply.role === "admin" && role !== "admin" ? null : (
              <div key={message.id} className={styles.reply}>
                <p className={styles.bubble}><span className="sr-only">RentWise: </span>{message.reply.text}</p>
                {message.reply.links?.map(link => <Link key={link.href} className={styles.link} href={link.href} onNavigate={minimize}>{link.label}</Link>)}
                {message.reply.records?.map((record, index) => (
                  <article key={index} className={styles.suggestion}>
                    <h3>{record.title}</h3>
                    {record.detail && <p>{record.detail}</p>}
                    {record.links?.length && <div className={styles.recordActions}>
                      {record.links.map(link => <Link key={link.href} className={styles.link} href={link.href} onNavigate={minimize}>{link.label}</Link>)}
                    </div>}
                  </article>
                ))}
                {message.reply.properties?.map(property => <Suggestion key={property.id} property={property} onNavigate={minimize} />)}
                {message.reply.nearBudget && (
                  <section className={styles.nearBudget} aria-label="Near your budget">
                    <h3>Near your budget</h3>
                    <p>Starting rent above {money(message.reply.nearBudget.limit)} per month.</p>
                    {message.reply.nearBudget.properties.map(property => <Suggestion key={property.id} property={property} onNavigate={minimize} />)}
                  </section>
                )}
                {message.reply.offerLocation && (
                  <button className={styles.link} type="button" onClick={useLocation} disabled={pending}>
                    Use my location
                  </button>
                )}
              </div>
            ))}
            {pending && (
              <p className={styles.typing} role="status">
                <span aria-hidden="true"><i /><i /><i /></span> Working on it…
              </p>
            )}
            {error && <p className={styles.error} role="alert">{error}</p>}
          </div>
          <form className={styles.composer} onSubmit={event => { event.preventDefault(); send(); }}>
            <div className={styles.composeRow}>
              <label className="sr-only" htmlFor="rentcheck-chat-message">Message</label>
              <input id="rentcheck-chat-message" ref={input} value={draft} onChange={event => setDraft(event.target.value)}
                placeholder={role === "admin" ? "Ask about requests or admin tools…" : "Ask about properties or RentCheck…"} enterKeyHint="send" maxLength={messageLimit} />
              <button className="button" type="submit" disabled={!role || pending || !draft.trim()} aria-label="Send message">
                <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="m3 11 18-8-8 18-2-8-8-2Zm8 2L21 3" /></svg>
              </button>
            </div>
            <div className={styles.composerFooter}>
              <Link href="/privacy#privacy-external-providers" onNavigate={minimize}>Chat privacy</Link>
              <button type="button" onClick={clear} disabled={!messages.length && !pending && !draft}>New chat</button>
            </div>
          </form>
        </section>
      ) : (
        <button ref={launcher} className={styles.launcher} type="button" onClick={() => { setChecked(undefined); setMode("open"); }}
          aria-label="Open RentWise" aria-expanded={false}>
          <ChatIcon />{mode === "minimized" && <span>RentWise</span>}
        </button>
      )}
    </div>
  );
}

function ChatIcon() {
  return (
    <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-3.5A2 2 0 0 1 3 16V7a2 2 0 0 1 2-2Z" />
      <path d="M8 11.5h.01m4 0h.01m4 0h.01" strokeWidth="2.4" />
    </svg>
  );
}

function Suggestion({ property, onNavigate }: { property: AssistantProperty; onNavigate: () => void }) {
  return (
    <article className={styles.suggestion}>
      <h3>{property.name}</h3>
      <p>{[property.locality, property.city].filter(Boolean).join(", ")}</p>
      <strong className={styles.rent}>{money(property.rent_min)}–{money(property.rent_max)} <small>/ month</small></strong>
      <div className={styles.ratings}>
        <span><span aria-hidden="true">★ </span><span className="sr-only">Overall rating: </span>{property.property_rating == null ? "Unrated" : `${Number(property.property_rating).toFixed(1)}/5`}</span>
        {property.womenRating != null && <span><WomenRatingIcon /><span className="sr-only">Women Tenant Rating: </span>{property.womenRating.toFixed(1)}/5</span>}
      </div>
      {(property.preferences.length > 0 || property.verified || property.is_demo) && (
        <ul className={styles.tags} aria-label="Property details">
          {property.preferences.map(preference => <li key={preference}>{preference}</li>)}
          {property.verified && <li className={styles.verified}><ActionIcon name="check" />{property.is_demo ? "Demo tenants verified" : "Tenant verified"}</li>}
          {property.is_demo && <li>Demo property</li>}
        </ul>
      )}
      <Link className={styles.link} href={`/properties/${property.id}`} onNavigate={onNavigate} aria-label={`View property: ${property.name}`}>View property</Link>
    </article>
  );
}
