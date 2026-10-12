"use client";
import { useId, useRef, type ReactNode } from "react";
import { ActionIcon } from "./action-feedback";

export function ActionModal({ title, trigger, children, warning = false, triggerContent, triggerClassName = "" }: { title: string; trigger: string; children: ReactNode; warning?: boolean; triggerContent?: ReactNode; triggerClassName?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  return <>
    <button type="button" className={`review-action ${warning ? "warning-action" : ""} ${triggerClassName}`} aria-label={trigger} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{triggerContent ?? <><ActionIcon name={warning ? "warning" : "edit"} />{trigger}</>}</button>
    <dialog ref={dialog} className="action-modal" aria-labelledby={heading}>
      <header className="action-modal-heading"><h2 id={heading}>{title}</h2><button type="button" className="modal-close" aria-label={`Close ${title.toLowerCase()}`} onClick={() => dialog.current?.close()}>×</button></header>
      {children}
    </dialog>
  </>;
}
