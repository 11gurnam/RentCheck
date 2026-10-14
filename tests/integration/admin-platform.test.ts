import { test, expect } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
test("platform authorization, metrics, moderation, suspension and dispute lifecycle",async()=>{
 const config=localBackendConfiguration();if(!config)throw new Error("Local backend required");
 const service=createClient(config.url,config.serviceKey,{auth:{persistSession:false}}),anon=createClient(config.url,config.publicKey,{auth:{persistSession:false}});
 const users:string[]=[],clients:SupabaseClient[]=[],paths:string[]=[];let property:string|undefined;
 const name="Admin platform "+crypto.randomUUID().slice(0,8),password="Synthetic platform test password";
 try{
  for(let i=0;i<3;i++){const email=`admin-platform-${crypto.randomUUID()}@example.test`;const u=await service.auth.admin.createUser({email,password,email_confirm:true});expect(u.error).toBeNull();users.push(u.data.user!.id);const c=createClient(config.url,config.publicKey,{auth:{persistSession:false}});expect((await c.auth.signInWithPassword({email,password})).error).toBeNull();clients.push(c);}
  fixtureAdmin(users[2],true);
  const p=await clients[1].rpc("create_property",{p_input:{name,address:"Synthetic platform address",state:"Delhi",city:"Platform test city",locality:"Test district",type:"House",min:1000,max:2000,synthetic:true},p_acknowledged:true});expect(p.error).toBeNull();property=p.data;
  const review=await clients[0].rpc("create_review",{p_input:{property,start:"2024-01-01",current:true,paid:1500,propertyRating:4,body:"The water supply was unreliable. This is legitimate negative feedback.",synthetic:true}});expect(review.error).toBeNull();const reviewId=review.data.id;
  const action={p_kind:"review",p_target:reviewId,p_action:"hidden",p_reason:"Synthetic investigation requires temporary hiding"};
  for(const client of [anon,clients[0]]){
   for(const [rpc,args] of [["get_admin_platform_overview",{}],["get_admin_platform_list",{p_kind:"users"}],["get_admin_record_details",{p_kind:"reviews",p_id:reviewId}],["get_admin_notes",{p_kind:"review",p_target:reviewId}],["get_admin_audit_search",{}],["admin_platform_action",action],["get_admin_verification_queue",{}],["get_admin_media",{p_kind:"review",p_photo:crypto.randomUUID()}]] as const)expect((await client.rpc(rpc,args)).error,`${rpc} must be protected`).not.toBeNull();
  }
  const before=await clients[2].rpc("get_admin_platform_overview");expect(before.error).toBeNull();expect(before.data.properties).toBeGreaterThan(0);expect(before.data.trends).toHaveLength(6);
  const list=await clients[2].rpc("get_admin_platform_list",{p_kind:"properties",p_filters:{query:name}});expect(list.error).toBeNull();expect(list.data.rows[0].rating).toBe(4);
  expect((await clients[2].rpc("admin_platform_action",action)).error).toBeNull();expect((await clients[2].rpc("get_admin_platform_list",{p_kind:"reviews",p_filters:{id:reviewId}})).data.rows[0].status).toBe("hidden");
  expect((await clients[2].rpc("admin_platform_action",{...action,p_action:"visible"})).error).toBeNull();
  expect((await clients[2].rpc("admin_platform_action",{...action,p_action:"note",p_reason:"Private investigative note never shown to applicants"})).error).toBeNull();
  expect((await clients[2].rpc("get_admin_notes",{p_kind:"review",p_target:reviewId})).data[0].body).toContain("Private investigative note");
  const caseId=await clients[0].rpc("submit_platform_case",{p_kind:"review",p_target:reviewId,p_reason:"Please investigate this synthetic moderation appeal"});expect(caseId.error).toBeNull();
  expect((await clients[1].rpc("submit_platform_case",{p_kind:"review",p_target:reviewId,p_reason:"Trying to appeal another user's review"})).error?.code).toBe("42501");
  const ca={p_kind:"case",p_target:caseId.data,p_action:"assign",p_reason:"Reviewing synthetic moderation appeal with recorded reason"};expect((await clients[2].rpc("admin_platform_action",ca)).error).toBeNull();expect((await clients[2].rpc("admin_platform_action",{...ca,p_action:"request_information"})).error).toBeNull();
  expect((await clients[0].rpc("respond_platform_case",{p_case:caseId.data,p_message:"Here is a factual clarification for the administrator."})).error).toBeNull();expect((await clients[2].rpc("admin_platform_action",{...ca,p_action:"resolved"})).error).toBeNull();
  expect(JSON.stringify((await clients[0].rpc("get_my_platform_cases")).data)).not.toContain("Private investigative note");
  const account={p_kind:"account",p_target:users[0],p_action:"suspended",p_reason:"Synthetic policy suspension must block existing sessions"};expect((await clients[2].rpc("admin_platform_action",account)).error).toBeNull();expect((await clients[0].rpc("get_my_account_status")).data).toBe("suspended");
  expect((await clients[0].rpc("edit_review",{p_review:reviewId,p_input:{current:true,paid:1500,propertyRating:4,body:"A suspended session must not edit platform records",synthetic:true}})).error?.code).toBe("42501");
  expect((await clients[2].rpc("admin_platform_action",{...account,p_target:users[2]})).error?.code).toBe("42501");expect((await clients[2].rpc("admin_platform_action",{...account,p_action:"active"})).error).toBeNull();
  const propAction={p_kind:"property",p_target:property,p_action:"hidden",p_reason:"Synthetic suspicious listing suspension for inspection"};expect((await clients[2].rpc("admin_platform_action",propAction)).error).toBeNull();expect((await anon.from("properties").select("id").eq("id",property!)).data).toEqual([]);expect((await clients[2].rpc("get_admin_record_details",{p_kind:"properties",p_id:property})).error).toBeNull();expect((await clients[2].rpc("admin_platform_action",{...propAction,p_action:"published"})).error).toBeNull();
  const png=await sharp({create:{width:100,height:100,channels:3,background:"white"}}).jpeg().toBuffer(),document=crypto.randomUUID(),path=`verification/${document}.jpg`;paths.push(path);expect((await service.storage.from("rental-documents").upload(path,png,{contentType:"image/jpeg"})).error).toBeNull();
  const verification=await service.rpc("register_evidence_bundle",{p_user:users[0],p_documents:[{id:document,extension:"jpg"}],p_kind:"lease",p_review:reviewId,p_demo:true,p_consent:true});expect(verification.error).toBeNull();
  const v={p_kind:"tenant",p_application:verification.data,p_action:"disputed",p_reason:"Synthetic document discrepancy requires investigation"};expect((await clients[2].rpc("manage_verification",v)).error).toBeNull();expect((await clients[0].rpc("review_is_verified",{p_review:reviewId})).data).toBe(false);
  const disputes=await clients[2].rpc("get_admin_platform_list",{p_kind:"cases",p_filters:{status:"open"}});const dispute=disputes.data.rows.find((row:{target_id:string})=>row.target_id===verification.data);expect(dispute).toBeTruthy();
  expect((await clients[2].rpc("admin_platform_action",{...ca,p_target:dispute.id,p_action:"resolved"})).error?.message).toContain("Resolve the verification");
  expect((await clients[2].rpc("manage_verification",{...v,p_action:"approved",p_reason:"Synthetic discrepancy resolved and evidence approved"})).error).toBeNull();expect((await clients[0].rpc("review_is_verified",{p_review:reviewId})).data).toBe(true);
  expect((await clients[2].rpc("get_admin_platform_list",{p_kind:"cases",p_filters:{id:dispute.id}})).data.rows[0].status).toBe("resolved");
  expect((await clients[2].rpc("get_admin_platform_overview")).data.verified_tenants).toBe(before.data.verified_tenants);
  expect((await clients[2].rpc("get_admin_verification_queue",{p_filters:{document:"lease",reviewer:"mine",property}})).data.rows.some((r:{id:string})=>r.id===verification.data)).toBe(true);
  expect((await clients[2].rpc("record_admin_document_access",{p_document:document})).error).toBeNull();expect((await clients[0].rpc("record_admin_document_access",{p_document:document})).error?.code).toBe("42501");
  expect((await clients[2].rpc("admin_platform_action",{...action,p_action:"removed"})).error).toBeNull();expect((await clients[2].rpc("admin_platform_action",{...action,p_action:"visible"})).error).not.toBeNull();
  const audit=await clients[2].rpc("get_admin_audit_search",{p_filters:{entity:reviewId}});expect(audit.error).toBeNull();expect(audit.data.entries.some((e:{action:string})=>e.action==="review_hidden")).toBe(true);
  expect(()=>execFileSync("docker",["exec","supabase_db_rentcheck-accounts-test","psql","-U","postgres","-d","postgres","-c",`update private.audit_events set reason='An illegal attempt to rewrite an audit event' where entity_id='${reviewId}';`],{encoding:"utf8",stdio:"pipe"})).toThrow("Audit records are immutable");
  const authorReview=await clients[1].rpc("create_review",{p_input:{property,start:"2023-01-01",current:false,end:"2023-06-01",paid:1200,propertyRating:3,body:"Synthetic author privacy test.",synthetic:true}});
  expect(authorReview.error).toBeNull();
  expect((await clients[2].rpc("admin_platform_action",{...action,p_target:authorReview.data.id})).error).toBeNull();
  expect((await clients[1].rpc("delete_review",{p_review:authorReview.data.id})).error).toBeNull();
  expect((await clients[2].rpc("admin_platform_action",{...action,p_target:authorReview.data.id,p_action:"visible"})).error).not.toBeNull();
 }
 finally{if(paths.length)await service.storage.from("rental-documents").remove(paths);for(const id of users)expect((await service.auth.admin.deleteUser(id)).error).toBeNull();if(property)await service.from("properties").delete().eq("id",property);}
});
