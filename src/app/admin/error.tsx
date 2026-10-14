"use client";
import { useTransition } from "react";
export default function AdminError({retry}:{retry:()=>void}) {const[pending,start]=useTransition();return <section className="dashboard-card"><h1>Administration is unavailable.</h1><p role="alert">We couldn’t load these records. Try again shortly.</p><button className="button" disabled={pending} onClick={()=>start(()=>retry())}>{pending?"Retrying…":"Try again"}</button></section>;}
