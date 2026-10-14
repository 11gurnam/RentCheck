"use client";
import Image from "next/image";
import { useState } from "react";
import type { EvidenceDocument } from "@/features/privacy/evidence-upload";
export function DocumentViewer({documents}:{documents:EvidenceDocument[]}) {
  const files=documents.filter(d=>!d.expired),[index,setIndex]=useState(0),[zoom,setZoom]=useState(100);
  if(!files.length)return <p className="action-feedback feedback-warning">No current evidence is available. Request a fresh evidence set.</p>;
  const file=files[index];
  return <div className="admin-document-viewer"><div className="review-actions"><label>Supporting document<select aria-label="Supporting document" value={index} onChange={e=>{setIndex(Number(e.target.value));setZoom(100);}}>{files.map((d,i)=><option value={i} key={d.id}>{i+1}. {d.evidence_kind.replaceAll("_"," ")}</option>)}</select></label>{file.content_type!=="application/pdf"&&<><button type="button" className="review-action" disabled={zoom<=50} onClick={()=>setZoom(zoom-25)}>Zoom out</button><span>{zoom}%</span><button type="button" className="review-action" disabled={zoom>=300} onClick={()=>setZoom(zoom+25)}>Zoom in</button></>}<a className="review-action" href={`/api/documents/${file.id}`} target="_blank" rel="noopener">Open / download original</a></div><div className="admin-document-canvas" tabIndex={0} role="region" aria-label="Private evidence preview">{file.content_type==="application/pdf"?<iframe title="Private supporting PDF" src={`/api/documents/${file.id}?preview=pdf`}/>:<Image src={`/api/documents/${file.id}?preview=image`} alt={`Private ${file.evidence_kind} evidence`} width={1200} height={1000} unoptimized style={{width:`${zoom}%`,maxWidth:"none",height:"auto"}}/>}</div><p className="field-hint">Read the address and dates from the document. If the PDF viewer is unavailable, open the original in your device viewer. File validation does not prove authenticity.</p></div>;
}
