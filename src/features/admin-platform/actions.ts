"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import type { ReviewState } from "@/features/reviews/validation";
const input = z.object({ kind: z.enum(["property","review","reply","account","case","tenant","landlord"]), target: z.uuid(), action: z.enum(["hidden","published","suspended","active","visible","removed","assign","request_information","escalated","resolved","note","open_case"]), reason: z.string().trim().min(10).max(2000) });
export async function platformAction(_: ReviewState, form: FormData): Promise<ReviewState> {
  await requireUser("/admin");
  if (!(await isAdministrator())) return { message: "Administrator access required." };
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Choose a valid action and give a reason of 10–2000 characters." };
  const d = parsed.data, client = await createDatabaseClient();
  if (d.kind === "reply" && d.action !== "removed") return { message: "Only removal is supported for landlord responses." };
  const result = d.kind === "reply" ? await client.rpc("admin_remove_landlord_reply",{p_reply:d.target,p_reason:d.reason}) : d.action === "open_case" ? await client.rpc("submit_platform_case", { p_kind:d.kind,p_target:d.target,p_reason:d.reason }) : await client.rpc("admin_platform_action",{ p_kind:d.kind,p_target:d.target,p_action:d.action,p_reason:d.reason });
  if (result.error) return { message: result.error.message };
  for (const path of ["/admin","/account","/properties","/landlords","/claims"]) revalidatePath(path,"layout");
  revalidatePath("/search"); revalidatePath("/saved");
  return { status:"success",message:d.action === "note" ? "Private note saved. Only administrators can read it." : "Action saved and audited. Related permissions and notifications have been updated." };
}
export async function submitAppeal(_: ReviewState, form: FormData): Promise<ReviewState> {
  await requireUser("/account/appeals");
  const parsed = z.object({kind:z.enum(["property","review","tenant","landlord"]),target:z.uuid(),reason:z.string().trim().min(10).max(2000)}).safeParse(Object.fromEntries(form));
  if (!parsed.success) return {message:"Select a record and describe your report or appeal in 10–2000 characters."};
  const {error} = await (await createDatabaseClient()).rpc("submit_platform_case",{p_kind:parsed.data.kind,p_target:parsed.data.target,p_reason:parsed.data.reason});
  if(error) return {message:error.message};
  revalidatePath("/account/appeals");revalidatePath("/admin","layout");
  return {status:"success",message:"Your report or appeal was submitted for administrative review."};
}
export async function respondCase(_:ReviewState,form:FormData):Promise<ReviewState> {
  await requireUser("/account/appeals");
  const parsed=z.object({target:z.uuid(),reason:z.string().trim().min(10).max(2000)}).safeParse(Object.fromEntries(form));
  if(!parsed.success) return {message:"Enter your response in 10–2000 characters."};
  const {error}=await (await createDatabaseClient()).rpc("respond_platform_case",{p_case:parsed.data.target,p_message:parsed.data.reason});
  if(error)return {message:error.message};revalidatePath("/account/appeals");revalidatePath("/admin","layout");return {status:"success",message:"Your response was saved for the reviewer."};
}

