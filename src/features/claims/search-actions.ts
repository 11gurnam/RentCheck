"use server";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { filtersSchema } from "@/features/discovery/filters";
export async function findClaimProperties(query: string) {
 await requireUser("/claims/new");
 const parsed=filtersSchema.safeParse({q:query});
 if (!parsed.success) return {message:"Search using up to 120 characters.",rows:[]};
 try {
  const db=await createDatabaseClient();
  const rows:{id:string;name:string;address:string;city:string;is_demo:boolean}[]=[];
  // Read the public discovery view in batches so the initial catalogue is complete.
  for(let offset=0;;offset+=1000){
   const batch=await db.from("property_discovery").select("id,name,address,city,is_demo").order("name").order("id").range(offset,offset+999);
   if(batch.error)throw batch.error;
   rows.push(...batch.data);
   if(batch.data.length<1000)break;
  }
  const query=parsed.data.q.toLocaleLowerCase();
  return {rows:query?rows.filter(p=>`${p.name} ${p.address} ${p.city}`.toLocaleLowerCase().includes(query)):rows};
 }
 catch {return {message:"Property search is temporarily unavailable. Please try again.",rows:[]};}
}
