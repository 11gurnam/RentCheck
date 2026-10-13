import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
import { displayDate } from "@/lib/display-date";
export async function TenantVerificationStatus() {
 const {data,error}=await (await createDatabaseClient()).rpc("get_my_tenancy_status");
 if(error) return <p role="status">Tenancy verification status is temporarily unavailable.</p>;
 const stays=(data??[]) as {review_id:string;property:string;address:string;start:string;end:string|null;is_demo:boolean;verified:boolean}[];
 const verified=stays.some(s=>s.verified&&!s.is_demo);
 return <section className="dashboard-card account-activity-panel"><h2>Tenant verification</h2><p><span className={`semantic-status ${verified?"status-success":"status-warning"}`}>{verified?"Verified Tenant":"Unverified Tenant"}</span> · Verification applies only to the property and tenancy listed below.</p><p className="field-hint">Evidence confirms your connection to a property, not the accuracy of your opinions. You can review places without verification.</p>{!stays.length&&<a className="review-action" href="/search">Find a property and share your experience</a>}{stays.map(s=><div className="tenancy-verification-row" key={s.review_id}><div><strong>{s.property}</strong><span>{displayDate(s.start)} → {s.end?displayDate(s.end):"Current"}</span><small>{s.is_demo ? s.verified?"Demonstration verified tenant":"Unverified demo tenancy" : s.verified?"Verified Tenant for this stay":"Unverified Tenant for this stay"}</small></div><a className="review-action" href={`/reviews/${s.review_id}/edit`}>{s.verified?"View verification":"Submit or track evidence"}</a></div>)}</section>;
}
