"use client";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
export function FilePicker({ label, name, accept, photo = false, disabled = false, onFile }: { label: string; name: string; accept: string; photo?: boolean; disabled?: boolean; onFile?: (file: File | null) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => photo && file?.type.startsWith("image/") ? URL.createObjectURL(file) : null, [file, photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <div className="file-picker">
    <label htmlFor={id}>{label}</label>
    <input ref={input} id={id} className="sr-only" type="file" name={name} accept={accept} required disabled={disabled} onChange={event => { const next = event.target.files?.[0] ?? null; setFile(next); onFile?.(next); }} />
    <div className="file-picker-selection">{preview && <Image unoptimized src={preview} width={80} height={80} alt="Selected photo preview" />}
      <div><button type="button" className="secondary-button" disabled={disabled} onClick={() => input.current?.click()}>{file ? "Change selection" : photo ? "Select photo" : "Select document"}</button>
      <p className="field-hint">{file?.name ?? (photo ? "No photo selected" : "No document selected")}</p></div>
    </div>
  </div>;
}
