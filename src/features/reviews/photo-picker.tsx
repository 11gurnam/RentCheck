"use client";
import Image from "next/image";
import { CameraIcon } from "@/components/ui/camera-icon";
import { useEffect, useRef, useState } from "react";


function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const object = URL.createObjectURL(file);
    // Object URLs stay local and are released when a selected photo is removed.
    const timer = setTimeout(() => setUrl(object), 0);
    return () => { clearTimeout(timer); URL.revokeObjectURL(object); };
  }, [file]);
  return url ? <Image src={url} alt={file.name} width={80} height={64} unoptimized /> : null;
}

export function ReviewPhotoPicker({ files, onChange, existingCount, disabled }: {
  files: File[]; onChange: (files: File[]) => void; existingCount: number; disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const count = existingCount + files.length;
  return <div className="review-photo-picker">
    <div className="review-photo-picker-heading">
      <button type="button" className="review-action" disabled={disabled || count >= 5} onClick={() => input.current?.click()}><CameraIcon />Add Photos</button>
      <small aria-live="polite">{count}/5 photos · Optional</small>
    </div>
    <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" aria-label="Select review photos" onChange={e => {
      const selected = Array.from(e.target.files ?? []);
      const valid: File[] = [];
      const errors: string[] = [];
      for (const file of selected) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 3145728) {
          errors.push(`${file.name}: choose a JPG, PNG or WebP image up to 3 MiB.`);
        } else if (count + valid.length >= 5) {
          errors.push("A review can have up to 5 photos.");
        } else if (!files.concat(valid).some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) valid.push(file);
      }
      onChange([...files, ...valid]);
      setError([...new Set(errors)].join(" "));
      e.target.value = "";
    }} />
    {!!files.length && <ul className="review-photo-selection" aria-label="Selected review photos">{files.map((file, i) => <li key={`${file.name}-${file.lastModified}-${i}`}><Preview file={file} /><button type="button" disabled={disabled} aria-label={`Remove ${file.name}`} onClick={() => { onChange(files.filter((_, index) => index !== i)); setError(""); }}>×</button></li>)}</ul>}
    <p className="field-hint">JPG, PNG or WebP · up to 3 MiB each. Photos upload when you publish or save.</p>
    {error && <p className="review-photo-error" role="alert">{error}</p>}
  </div>;
}
