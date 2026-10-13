"use server";
import { requireUser } from "@/lib/auth/session";
import { searchProperties } from "@/features/discovery/data";
import { filtersSchema } from "@/features/discovery/filters";
export async function findClaimProperties(query: string) {
 await requireUser("/claims/new");
 const parsed=filtersSchema.safeParse({q:query});
 if (!parsed.success) return {message:"Search using up to 120 characters.",rows:[]};
 try { const rows=await searchProperties(parsed.data);return {rows:rows.map(p=>({id:p.id,name:p.name,address:p.address,city:p.city,is_demo:p.is_demo}))}; }
 catch {return {message:"Property search is temporarily unavailable. Please try again.",rows:[]};}
}
