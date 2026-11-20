"use client";

import { useEffect, useRef, useState } from "react";
import { ActionIcon } from "@/components/ui/action-feedback";
import { SaveForm } from "@/features/contributions/forms";
import { CardPhotoUpload } from "@/features/reviews/card-photo-upload";

export function ShortlistCardMenu({ property, name }: { property: string; name: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (menu.current && event.target instanceof Node && !menu.current.contains(event.target)) {
        menu.current.open = false;
      }
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open]);

  return (
    <details
      ref={menu}
      className="shortlist-card-menu"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !event.currentTarget.open || (event.target instanceof Element && event.target.closest("dialog[open]"))) return;
        event.preventDefault();
        event.currentTarget.open = false;
        trigger.current?.focus();
      }}
    >
      <summary ref={trigger} aria-label={`More actions for ${name}`}><span aria-hidden="true">⋯</span></summary>
      <div className="shortlist-card-menu-items">
        <CardPhotoUpload property={property} name={name} />
        <a className="review-action" href={`/reviews/new?property=${property}`}><ActionIcon name="edit" />Write a review</a>
        <SaveForm property={property} saved />
      </div>
    </details>
  );
}
