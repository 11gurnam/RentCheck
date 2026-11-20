"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./action-menu.module.css";

export function AdminActionMenu({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const positionPanel = useCallback(() => {
    const button = trigger.current;
    const popup = panel.current;
    if (!button || !popup) return;

    const anchor = button.getBoundingClientRect();
    const gap = 6;
    const edge = 8;
    const height = popup.offsetHeight;
    const width = popup.offsetWidth;
    const preferredTop = anchor.bottom + gap + height <= window.innerHeight - edge
      ? anchor.bottom + gap : anchor.top - height - gap;
    popup.style.left = Math.max(edge, Math.min(anchor.right - width, window.innerWidth - width - edge)) + "px";
    popup.style.top = Math.max(edge, Math.min(preferredTop, window.innerHeight - height - edge)) + "px";
    popup.dataset.positioned = "true";
  }, []);

  useEffect(() => {
    const popup = panel.current;
    if (!open || !popup) return;

    function dismissAfterDialog(event: Event) {
      if (event.target instanceof HTMLDialogElement && popup?.matches(":popover-open") &&
        !popup.querySelector("dialog[open]")) {
        popup.hidePopover();
        trigger.current?.focus();
      }
    }

    popup.addEventListener("close", dismissAfterDialog, true);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      popup.removeEventListener("close", dismissAfterDialog, true);
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open, positionPanel]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-controls={id}
        aria-expanded={open}
        popoverTarget={id}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="group"
        aria-label={label}
        className={styles.panel}
        onToggle={event => {
          if (event.target !== event.currentTarget) return;
          const visible = event.currentTarget.matches(":popover-open");
          if (visible) positionPanel();
          else delete event.currentTarget.dataset.positioned;
          setOpen(visible);
        }}
        onClick={event => {
          const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
          if (link && !link.closest("dialog")) event.currentTarget.hidePopover();
        }}
      >
        {children}
      </div>
    </>
  );
}
