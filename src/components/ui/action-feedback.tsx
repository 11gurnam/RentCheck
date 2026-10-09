import type { ReactNode } from "react";
export function ActionIcon({ name }: { name: "trash" | "edit" | "check" | "warning" | "upload" | "search" | "save" | "plus" | "shield" | "logout" }) {
 const paths = { trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>, edit: <><path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5"/></>, check: <path d="m5 12 4 4L19 6"/>, warning: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v1"/></>, upload: <><path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/></>, search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>, save: <><path d="M4 3h14l3 3v15H3V3h1Zm3 0v7h10V3M7 21v-7h10v7"/></>, plus: <path d="M12 4v16M4 12h16"/>, shield: <><path d="m12 3 9 4v6c0 5-9 8-9 8s-9-3-9-8V7l9-4Z"/><path d="m8 12 3 3 5-6"/></>, logout: <><path d="M9 3H3v18h6M8 12h13m-5-5 5 5-5 5"/></> };
 return <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function ActionFeedback({ message, status = "error" }: { message?: string; status?: "success" | "error" | "warning" | "idle" }) {
 const tone = status === "idle" ? "warning" : status;
 return message ? <p className={`action-feedback feedback-${tone}`} role={tone === "error" ? "alert" : "status"}><ActionIcon name={tone === "success" ? "check" : "warning"}/><span>{message}</span></p> : null;
}
export function StatusBadge({ status, children }: { status: string; children?: ReactNode }) {
 const tone = ["visible","published","approved","resolved","kept"].includes(status) ? "success" : ["deleted","removed","rejected","revoked"].includes(status) ? "danger" : "warning";
 return <span className={`semantic-status status-${tone}`}><ActionIcon name={tone === "success" ? "check" : tone === "danger" ? "trash" : "warning"}/>{children ?? status.replaceAll("_"," ")}</span>;
}
