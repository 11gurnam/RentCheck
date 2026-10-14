import { NextRequest } from "next/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { photonAddress } from "@/features/addresses/geocoding";
const limits=new Map<string,{count:number;expires:number}>();
export async function GET(request:NextRequest){
  const user=await getVerifiedUser();if(!user)return Response.json({message:"Sign in to look up an address."},{status:401});
  const now=Date.now();for(const [key,value]of limits)if(value.expires<now)limits.delete(key);
  const prior=limits.get(user.id)??{count:0,expires:now+60000};if(prior.count>=10)return Response.json({message:"Please wait a minute before another address lookup."},{status:429});
  const q=request.nextUrl.searchParams.get("q")?.trim(),lat=request.nextUrl.searchParams.get("lat"),lon=request.nextUrl.searchParams.get("lon");
  const endpoint=process.env.ADDRESS_LOOKUP_URL||"https://photon.komoot.io";
  const url=new URL(q?"api/":"reverse/",endpoint.replace(/\/$/,"")+"/");
  if(q){if(q.length<5||q.length>300)return Response.json({message:"Enter a more complete address."},{status:400});url.searchParams.set("q",q);url.searchParams.set("bbox","68,6,98,38");}
  else{if(!lat||!lon||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))||Number(lat)<6||Number(lat)>38||Number(lon)<68||Number(lon)>98)return Response.json({message:"Choose a location in India."},{status:400});url.searchParams.set("lat",lat);url.searchParams.set("lon",lon);}
  url.searchParams.set("limit","5");url.searchParams.set("lang","en");limits.set(user.id,{...prior,count:prior.count+1});
  try{const response=await fetch(url,{headers:{"User-Agent":"RentCheck/1.0 (rentchecksupport@gmail.com)"},signal:AbortSignal.timeout(10000),cache:"no-store"});if(!response.ok)throw Error();const data=await response.json();const results=(data.features??[]).map(photonAddress).filter(Boolean);return Response.json({results},{headers:{"Cache-Control":"no-store"}});}
  catch{return Response.json({message:"Address lookup is unavailable. You can still enter the address and PIN yourself."},{status:503});}
}
