"use client";
import { useRef, type ReactNode } from "react";
import { ActionIcon } from "./action-feedback";
import { createContext, useContext } from "react";
const ModalClose = createContext<() => void>(() => {});
export function ModalCancel({ disabled = false }: { disabled?: boolean }) {
  const close = useContext(ModalClose);
  return <button type="button" className="review-action" disabled={disabled} onClick={close}>Cancel</button>;
}

export function ActionModal({ title, trigger, children, warning = false, triggerContent, triggerClassName = "", beforeOpen, dialogClassName = "", onClose }: { title: string; trigger: string; children: ReactNode; warning?: boolean; triggerContent?: ReactNode; triggerClassName?: string; dialogClassName?: string; beforeOpen?: () => boolean; onClose?:()=>void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className={`review-action ${warning ? "warning-action" : ""} ${triggerClassName}`} aria-label={trigger} aria-haspopup="dialog" onClick={() => { if (!beforeOpen || beforeOpen()) dialog.current?.showModal(); }}>{triggerContent ?? <><ActionIcon name={warning ? "warning" : "edit"} />{trigger}</>}</button>
    <dialog ref={dialog} className={`action-modal ${dialogClassName}`} aria-label={title} onClose={onClose} onResetCapture={event=>{if(!(event.target instanceof HTMLFormElement)||event.target.dataset.allowFeedbackReset!=="true")event.preventDefault();}}>
      <header className="action-modal-heading"><h2>{title}</h2><button type="button" className="modal-close" aria-label={`Close ${title.toLowerCase()}`} onClick={() => dialog.current?.close()}><ActionIcon name="close"/></button></header>
      <ModalClose.Provider value={() => dialog.current?.close()}>{children}</ModalClose.Provider>
    </dialog>
  </>;
}
