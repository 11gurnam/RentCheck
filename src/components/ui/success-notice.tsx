"use client";
import { useEffect, useRef } from "react";

export function SuccessNotice({ message, receipt }: { message: string; receipt?:object }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form=marker.current?.closest("form");
    if(form){form.dataset.allowFeedbackReset="true";HTMLFormElement.prototype.reset.call(form);delete form.dataset.allowFeedbackReset;}
    let dialog = marker.current?.closest("dialog");
    while (dialog) {
      const parent = dialog.parentElement?.closest("dialog");
      dialog.close();
      dialog = parent ?? null;
    }
  }, [message, receipt]);
  return <span ref={marker} hidden />;
}
