"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import type { Photo } from "./data";
export function AdminMedia({photos,kind}:{photos:Photo[];kind:"review"|"property"}) {
  const ref=useRef<HTMLDialogElement>(null),[index,setIndex]=useState(0);
  if(!photos.length)return <p className="field-hint">No attached photos.</p>;
  const photo=photos[index];
  return <><button className="review-action" type="button" onClick={()=>ref.current?.showModal()}>View {photos.length} {photos.length===1?"photo":"photos"}</button><dialog ref={ref} className="rentcheck-photo-viewer" aria-label="Administrative photo viewer"><header className="photo-viewer-header"><h2>Photo {index+1} of {photos.length}</h2><button className="review-action" type="button" aria-label="Close photo viewer" onClick={()=>ref.current?.close()}>×</button></header><figure className="photo-viewer-figure"><Image src={`/api/admin/media/${kind}/${photo.id}`} width={1200} height={800} unoptimized alt="Submitted property or review photo"/><figcaption>{photo.name??"Review author"}{photo.role?` · ${photo.role}`:""}</figcaption></figure>{photos.length>1&&<div className="photo-viewer-nav"><button className="review-action" disabled={index===0} onClick={()=>setIndex(index-1)}>Previous</button><button className="review-action" disabled={index===photos.length-1} onClick={()=>setIndex(index+1)}>Next</button></div>}</dialog></>;
}
