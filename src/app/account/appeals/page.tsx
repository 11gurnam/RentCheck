import { AccountShell } from "@/components/ui/account-shell";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { StatusBadge } from "@/components/ui/action-feedback";
import { AppealForm, CaseResponse } from "@/features/admin-platform/forms";
import { displayDate } from "@/lib/display-date";
import { ownReviews } from "@/features/reviews/data";
import { myVerifications } from "@/features/verification/data";
import { myClaims } from "@/features/claims/data";
type Case={id:string;kind:string;target_id:string;status:string;reason:string;resolution:string|null;created_at:string};
export default async function AppealsPage(){
  await requireUser("/account/appeals");
  const {data,error}=await(await createDatabaseClient()).rpc("get_my_platform_cases");
  if(error)throw new Error("Your investigations are unavailable.");
  const rows=data as Case[];
  const reviews=await ownReviews(),claims=await myClaims(),verifications=await myVerifications();
  const records=[...reviews.map(r=>({id:r.id,kind:"review",label:`Review · ${r.property_name} · ${r.status}`})),...claims.map(c=>({id:c.id,kind:"landlord",label:`Property claim · ${c.name} · ${c.status}`})),...verifications.map(v=>({id:v.id,kind:"tenant",label:`Residence verification · ${reviews.find(r=>r.id===v.review_id)?.property_name??"Your stay"} · ${v.status}`}))];
  return <AccountShell><h1>Your reports and appeals</h1><p>Ask for a review of your verification or moderation decision. Documents stay in the original private verification workflow.</p><AppealForm records={records}/>{!rows.length&&<section className="empty-state"><p>No reports or appeals yet.</p></section>}{rows.map(row=><section className="dashboard-card" key={row.id}><h2>{row.kind} investigation</h2><StatusBadge status={row.status}/><p>{row.reason}</p><p className="field-hint">Submitted {displayDate(row.created_at.slice(0,10))} · Record {row.target_id}</p>{row.resolution&&<p><strong>Resolution:</strong> {row.resolution}</p>}{row.status==="awaiting_information"&&<CaseResponse id={row.id}/>}</section>)}</AccountShell>;
}
