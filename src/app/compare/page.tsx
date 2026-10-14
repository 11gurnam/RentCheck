import { AccountShell } from "@/components/ui/account-shell";
import { getProperty, searchProperties } from "@/features/discovery/data";
import { filtersSchema } from "@/features/discovery/filters";
import { PropertyComparison } from "@/features/discovery/compare";
import { createDatabaseClient } from "@/lib/database/server";
import { getVerifiedUser } from "@/lib/auth/session";
export default async function ComparePage() {
  const db=await createDatabaseClient();
  const saved=await getVerifiedUser() ? await db.rpc("get_saved_properties") : {data:[],error:null};
  const savedIds=(saved.data??[]).map((p:{property_id:string})=>p.property_id);
  const catalog=(await Promise.all(Array.from({length:Math.ceil(100/12)},(_,index)=>searchProperties(filtersSchema.parse({page:index+1}))))).flat().slice(0,100);
  const extra=await Promise.all(savedIds.filter((id:string)=>!catalog.some(p=>p.id===id)).map((id:string)=>getProperty(id)));
  const rows=[...catalog,...extra];
  return <AccountShell><h1>Compare accommodation</h1><p>Compare up to three places side by side. Your shortlisted places are selected first.</p>{saved.error&&<p role="alert">We couldn’t load your shortlist. You can still search for places below.</p>}<PropertyComparison properties={rows.filter(p => p !== null)} initialSelected={savedIds} /><p><a className="review-action" href="/saved">Your shortlist</a> <a className="review-action" href="/search">Explore places</a></p></AccountShell>;
}
