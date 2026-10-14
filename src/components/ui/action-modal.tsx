"use client";
import { useRef, type ReactNode } from "react";
import { ActionIcon } from "./action-feedback";

export function ActionModal({ title, trigger, children, warning = false, triggerContent, triggerClassName = "", beforeOpen, dialogClassName = "" }: { title: string; trigger: string; children: ReactNode; warning?: boolean; triggerContent?: ReactNode; triggerClassName?: string; dialogClassName?: string; beforeOpen?: () => boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className={`review-action ${warning ? "warning-action" : ""} ${triggerClassName}`} aria-label={trigger} aria-haspopup="dialog" onClick={() => { if (!beforeOpen || beforeOpen()) dialog.current?.showModal(); }}>{triggerContent ?? <><ActionIcon name={warning ? "warning" : "edit"} />{trigger}</>}</button>
    <dialog ref={dialog} className={`action-modal ${dialogClassName}`} aria-label={title}>
      <header className="action-modal-heading"><h2>{title}</h2><button type="button" className="modal-close" aria-label={`Close ${title.toLowerCase()}`} onClick={() => dialog.current?.close()}>×</button></header>
      {children}
    </dialog>
  </>;
}
