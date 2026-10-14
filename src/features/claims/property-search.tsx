"use client";
import { useState, useTransition } from "react";
import { findClaimProperties } from "./search-actions";
import { ActionIcon } from "@/components/ui/action-feedback";
export function ClaimPropertySearch() {
 const [query,setQuery]=useState("");
 const [result,setResult]=useState<Awaited<ReturnType<typeof findClaimProperties>> | null>(null);
 const [pending,start]=useTransition();
 return <section className="claim-property-search"><h2>Find your property</h2><p>Search by property name or address. Ownership or authorization evidence is reviewed for the property you select.</p><form className="claim-search-bar" onSubmit={e=>{e.preventDefault();start(async()=>setResult(await findClaimProperties(query)));}}><label><span className="sr-only">Property name or address</span><input value={query} onChange={e=>setQuery(e.target.value)} maxLength={120} placeholder="Property name or address" /></label><button className="primary-button" disabled={pending}><ActionIcon name="search" />{pending?"Searching…":"Search"}</button></form><div aria-live="polite">{result?.message&&<p role="alert">{result.message}</p>}{result&&!result.message&&!result.rows.length&&<p>No matching properties. Try another name or address.</p>}{result?.rows.map(p=><div key={p.id} className="claim-search-result"><div><strong>{p.name}</strong><span>{p.address} · {p.city}</span><small>{p.is_demo?"Demonstration property":"Property"}</small></div><a className="review-action" href={`/claims/new?kind=property&target=${p.id}`}>Claim this property</a></div>)}</div></section>;
}
