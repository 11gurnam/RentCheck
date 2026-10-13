"use client";
import Image from "next/image";
import { CameraIcon } from "@/components/ui/camera-icon";
import { useId, useRef, useState } from "react";
import { PhotoCaption, type PhotoSource } from "./caption";
export function PhotoMedia({ photos, title, compact = false, carousel = false }: { photos: PhotoSource[]; title: string; compact?: boolean; carousel?: boolean }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const track = useRef<HTMLDivElement>(null);
  if (!photos.length) return null;
  const current = photos[index];
  const open = (i: number) => { setIndex(i); dialog.current?.showModal(); };
  const move = (step: number) => setIndex(i => (i + step + photos.length) % photos.length);
  return <div className={carousel ? "tenant-photo-carousel" : compact ? "review-attachments" : "property-media"}>
    {carousel && <header className="tenant-photo-carousel-heading"><div><h3>Photos shared by tenants</h3><p>{photos.length} {photos.length === 1 ? "photo" : "photos"} from tenant experiences</p></div><div><button type="button" className="review-action" aria-label="Scroll tenant photos left" onClick={() => track.current?.scrollBy({left:-300,behavior:"smooth"})}>←</button><button type="button" className="review-action" aria-label="Scroll tenant photos right" onClick={() => track.current?.scrollBy({left:300,behavior:"smooth"})}>→</button></div></header>}
    {compact && <button type="button" className="review-photo-link" onClick={() => open(0)}><CameraIcon />View {photos.length} {photos.length === 1 ? "photo" : "photos"} attached to this review</button>}
    {!compact && <div ref={track} className={carousel ? "tenant-photo-track" : compact ? "review-attachment-thumbnails" : `property-media-grid media-count-${Math.min(photos.length, 5)}`} tabIndex={carousel ? 0 : undefined} role={carousel ? "region" : undefined} aria-label={carousel ? "Tenant photos, scroll to browse" : undefined}>
      {photos.slice(0, carousel ? photos.length : compact ? 3 : 5).map((photo, i) => <div key={photo.id} className="media-tile"><button type="button" className="media-image-button" onClick={() => open(i)} aria-label={`Open ${carousel ? "tenant photo" : compact ? "review attachment" : "property photo"} ${i + 1} from ${photo.alias || "uploader"}`}><Image src={`/api/photos/${photo.id}`} alt={`${carousel || compact ? "Tenant photo" : "Property photo"} shared by ${photo.alias || "uploader"}`} width={compact || carousel ? 240 : 800} height={compact || carousel ? 180 : 600} unoptimized loading={!compact && !carousel && i === 0 ? "eager" : "lazy"} />{compact && i === 2 && photos.length > 3 && <span className="attachment-more">+{photos.length - 3}</span>}</button>{!compact && <figure className="media-attribution"><PhotoCaption photo={photo} /></figure>}</div>)}
    </div>}
    {!compact && !carousel && <button type="button" className="review-action media-view-all" onClick={() => open(0)}>View all photos · {photos.length}</button>}
    <dialog ref={dialog} className="rentcheck-photo-viewer" aria-labelledby={titleId} onKeyDown={e => { if (e.key === "ArrowRight") { e.preventDefault(); move(1); } if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); } }}>
      <header className="photo-viewer-header"><div><h2 id={titleId}>{title}</h2><span aria-live="polite">Photo {index + 1} of {photos.length}</span></div><button type="button" autoFocus className="review-action" onClick={() => dialog.current?.close()} aria-label="Close photo viewer">×</button></header>
      <figure className="photo-viewer-figure"><Image src={`/api/photos/${current.id}`} alt={`Photo ${index + 1} shared by ${current.alias || "uploader"}`} width={1200} height={900} unoptimized /><PhotoCaption photo={current} /></figure>
      {current.review_href && <a className="text-link" href={current.review_href} onClick={() => dialog.current?.close()}>Read this tenant’s review</a>}
      {photos.length > 1 && <nav className="photo-viewer-nav" aria-label="Photo navigation"><button type="button" className="review-action" onClick={() => move(-1)}>← Previous</button><button type="button" className="review-action" onClick={() => move(1)}>Next →</button></nav>}
    </dialog>
  </div>;
}
