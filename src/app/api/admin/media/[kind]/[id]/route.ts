import { z } from "zod";
import { createDatabaseClient } from "@/lib/database/server";
import { createMediaClient } from "@/lib/database/privileged";
import { isAdministrator } from "@/lib/auth/session";
export const dynamic="force-dynamic";
export async function GET(_:Request,{params}:{params:Promise<{kind:string;id:string}>}) {
  if(!(await isAdministrator()))return new Response(null,{status:403,headers:{"Cache-Control":"no-store"}});
  const parsed=z.object({kind:z.enum(["property","review"]),id:z.uuid()}).safeParse(await params);
  if(!parsed.success)return new Response(null,{status:404});
  const {data:path,error}=await(await createDatabaseClient()).rpc("get_admin_media",{p_kind:parsed.data.kind,p_photo:parsed.data.id});
  if(error||!path)return new Response(null,{status:404});
  const {data,error:download}=await createMediaClient().storage.from("review-photos").download(path);
  if(download||!data)return new Response(null,{status:404});
  return new Response(await data.arrayBuffer(),{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
