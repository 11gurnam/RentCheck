"use client";
import { useId, useRef, type ReactNode } from "react";
import { ActionIcon } from "./action-feedback";

export function ActionModal({ title, trigger, children, warning = false }: { title: string; trigger: string; children: ReactNode; warning?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  return <>
    <button type="button" className={`review-action ${warning ? "warning-action" : ""}`} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}><ActionIcon name={warning ? "warning" : "edit"} />{trigger}</button>
    <dialog ref={dialog} className="action-modal" aria-labelledby={heading}>
      <header className="action-modal-heading"><h2 id={heading}>{title}</h2><button type="button" className="modal-close" aria-label={`Close ${title.toLowerCase()}`} onClick={() => dialog.current?.close()}>×</button></header>
      {children}
    </dialog>
  </>;
}
