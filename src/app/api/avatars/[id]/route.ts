import { createMediaClient } from "@/lib/database/privileged";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!z.uuid().safeParse(id).success) return new Response(null,{status:404});
  const media=createMediaClient();
  const {data:profile,error}=await media.from("public_profiles").select("avatar_object").eq("id",id).maybeSingle();
  if(error || !profile?.avatar_object) return new Response(null,{status:404,headers:{"Cache-Control":"no-store"}});
  const {data,error:downloadError}=await media.storage.from("profile-photos").download(profile.avatar_object);
  if(downloadError || !data) return new Response(null,{status:404});
  return new Response(await data.arrayBuffer(),{headers:{"Content-Type":"image/jpeg","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
