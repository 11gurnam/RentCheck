import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
const config=localBackendConfiguration();
if(!config)throw new Error("Local backend required");
it("property-specific evidence bundles, claim disputes and reply authorization", async()=>{
 const service=createClient(config.url,config.serviceKey,{auth:{persistSession:false}});
 const users:string[]=[];const clients:(typeof service)[]=[];const paths:string[]=[];
 const property="20000000-0000-4000-8000-000000000008";
 const other="20000000-0000-4000-8000-000000000003";
 const bytes=await sharp({create:{width:300,height:200,channels:3,background:"white"}}).jpeg().toBuffer();
 try{
  for(let i=0;i<4;i++){const email=`trust-${crypto.randomUUID()}@example.test`;const password="Synthetic evidence workflow password";const u=await service.auth.admin.createUser({email,password,email_confirm:true});expect(u.error).toBeNull();users.push(u.data.user!.id);const client=createClient(config.url,config.publicKey,{auth:{persistSession:false}});expect((await client.auth.signInWithPassword({email,password})).error).toBeNull();clients.push(client);}
  fixtureAdmin(users[3],true);
  const input={property,start:"2024-01-01",current:true,paid:15000,propertyRating:4,body:"Synthetic tenant review for property trust tests.",synthetic:true};
  const review=await clients[0].rpc("create_review",{p_input:input});expect(review.error).toBeNull();
  const second=await clients[0].rpc("create_review",{p_input:{...input,property:other}});expect(second.error).toBeNull();
  async function bundle(user:number, reviewId:string|null, propertyId:string|null, amount=2){const docs=[];for(let i=0;i<amount;i++){const id=crypto.randomUUID();const path=`${reviewId?"verification":"claim"}/${id}.jpg`;paths.push(path);expect((await service.storage.from("rental-documents").upload(path,bytes,{contentType:"image/jpeg"})).error).toBeNull();docs.push({id,extension:"jpg"});}const args={p_user:users[user],p_documents:docs,p_kind:reviewId?"utility":"ownership",p_review:reviewId,p_property:propertyId,p_demo:true,p_consent:true};expect((await clients[user].rpc("register_evidence_bundle",args)).error).not.toBeNull();const r=await service.rpc("register_evidence_bundle",args);expect(r.error).toBeNull();return {request:r.data as string,docs};}
  const verification=await bundle(0,review.data.id,null);
  expect((await clients[1].rpc("get_evidence_documents",{p_primary:verification.docs[0].id})).data).toEqual([]);
  expect((await clients[0].rpc("get_evidence_documents",{p_primary:verification.docs[0].id})).data).toHaveLength(2);
  expect((await clients[3].rpc("get_evidence_documents",{p_primary:verification.docs[0].id})).data).toHaveLength(2);
  const vd={p_request:verification.request,p_decision:"approved",p_reason:"Synthetic administrator reviewed property and dates"};
  expect((await clients[0].rpc("decide_verification",vd)).error?.code).toBe("42501");
  expect((await clients[3].rpc("decide_verification",vd)).error).toBeNull();
  expect((await clients[1].rpc("review_is_verified",{p_review:review.data.id})).data).toBe(true);
  expect((await clients[1].rpc("review_is_verified",{p_review:second.data.id})).data).toBe(false);
  const statuses=await clients[0].rpc("get_my_tenancy_status");expect(statuses.data.filter((s:{verified:boolean})=>s.verified)).toHaveLength(1);
  const first=await bundle(1,null,property);
  const reply={p_claim:first.request,p_review:review.data.id,p_body:"Synthetic property owner response."};
  expect((await clients[1].rpc("upsert_claimant_reply",reply)).error?.code).toBe("42501");
  const decision={p_claim:first.request,p_decision:"approved",p_reason:"Synthetic ownership evidence inspected"};
  expect((await clients[3].rpc("decide_claim",decision)).error).toBeNull();
  expect((await clients[1].rpc("upsert_claimant_reply",reply)).error).toBeNull();
  expect((await clients[1].rpc("upsert_claimant_reply",{...reply,p_review:second.data.id})).error?.code).toBe("42501");
  const competing=await bundle(2,null,property);
  const competingRows=await clients[2].rpc("get_my_claims");expect(competingRows.data.find((c:{id:string})=>c.id===competing.request).status).toBe("disputed");
  expect((await clients[2].rpc("upsert_claimant_reply",{...reply,p_claim:competing.request})).error?.code).toBe("42501");
  expect((await clients[3].rpc("decide_claim",{...decision,p_claim:competing.request})).error).not.toBeNull();
  expect((await clients[3].rpc("decide_claim",{...decision,p_decision:"disputed"})).error).toBeNull();
  expect((await clients[1].rpc("upsert_claimant_reply",reply)).error?.code).toBe("42501");
  expect((await clients[0].rpc("get_claimant_replies",{p_review:review.data.id})).data).toHaveLength(0);
  expect((await clients[3].rpc("decide_claim",decision)).error).toBeNull();
  expect((await clients[0].rpc("get_claimant_replies",{p_review:review.data.id})).data).toHaveLength(1);
  expect((await clients[3].rpc("decide_claim",{...decision,p_decision:"revoked"})).error).toBeNull();
  expect((await clients[0].rpc("get_claimant_replies",{p_review:review.data.id})).data).toHaveLength(0);
  expect((await clients[0].rpc("update_tenancy",{p_review:review.data.id,p_current:false,p_end:"2024-12-01",p_paid:15000})).error).toBeNull();
  expect((await clients[1].rpc("review_is_verified",{p_review:review.data.id})).data).toBe(false);
  const requestRows=await clients[0].rpc("get_my_verifications");expect(requestRows.data.find((v:{id:string})=>v.id===verification.request).status).toBe("revoked");
  expect((await clients[3].rpc("get_admin_audit")).data.some((event:{action:string})=>event.action==="evidence_status")).toBe(true);
 }finally{await service.storage.from("rental-documents").remove(paths);for(const user of users)expect((await service.auth.admin.deleteUser(user)).error).toBeNull();}
});
