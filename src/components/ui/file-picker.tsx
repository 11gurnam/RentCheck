"use client";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
export function FilePicker({ label, name, accept, photo = false, disabled = false, multiple = false, onFile, onFiles }: { label: string; name: string; accept: string; photo?: boolean; disabled?: boolean; multiple?: boolean; onFile?: (file: File | null) => void; onFiles?: (files: File[], input: HTMLInputElement) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const preview = useMemo(() => photo && file?.type.startsWith("image/") ? URL.createObjectURL(file) : null, [file, photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <div className="file-picker">
    <label htmlFor={id}>{label}</label>
    <input ref={input} id={id} className="sr-only" type="file" name={name} accept={accept} required multiple={multiple} disabled={disabled} onChange={event => { const files = Array.from(event.target.files ?? []); const next = files[0] ?? null; setFile(next); setNames(files.map(file => file.name)); onFile?.(next); onFiles?.(files, event.target); }} />
    <div className="file-picker-selection">{preview && <Image unoptimized src={preview} width={80} height={80} alt="Selected photo preview" />}
      <div><button type="button" className="secondary-button" disabled={disabled} onClick={() => input.current?.click()}>{file ? "Change selection" : photo ? "Select photo" : "Select document"}</button>
      <p className="field-hint">{names.length ? names.join(", ") : (photo ? "No photo selected" : "No document selected")}</p></div>
    </div>
  </div>;
}
