import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { cleanupReviewUser } from "../helpers/review-cleanup";

it("deleted reviews leave public and admin property counts and averages immediately", async () => {
  const config=localBackendConfiguration();if(!config)throw Error("Local backend required");
  const service=createClient(config.url,config.serviceKey,{auth:{persistSession:false}});
  const ids:string[]=[],clients:(typeof service)[]=[],reviews:string[]=[];
  let property:string|undefined;
  try {
    for(let n=0;n<3;n++) {
      const email=`count-${crypto.randomUUID()}@example.test`,password="Synthetic count test password";
      const user=await service.auth.admin.createUser({email,password,email_confirm:true});expect(user.error).toBeNull();ids.push(user.data.user!.id);
      const client=createClient(config.url,config.publicKey,{auth:{persistSession:false}});await client.auth.signInWithPassword({email,password});clients.push(client);
    }
    fixtureAdmin(ids[2],true);
    const created=await clients[0].rpc("create_property",{p_input:{name:"Synthetic count property",address:`Count lane ${crypto.randomUUID()}`,state:"Delhi",city:"Count city",locality:"Count area",type:"Flat",min:1000,max:2000,synthetic:true},p_acknowledged:true});
    expect(created.error).toBeNull();property=created.data;
    for(let n=0;n<2;n++) {
      const review=await clients[n].rpc("create_review",{p_input:{property,start:"2024-01-01",current:true,paid:1500,propertyRating:n?4:2,body:"Synthetic review for visible count testing.",synthetic:true}});
      expect(review.error).toBeNull();reviews.push(review.data.id);
    }
    async function assertScores(count:number,rating:number|null) {
      const scores=await clients[1].from("property_scores").select("*").eq("property_id",property!).maybeSingle();expect(scores.error).toBeNull();
      expect(Number(scores.data?.review_count??0)).toBe(count);expect(scores.data?Number(scores.data.property_rating):null).toBe(rating);
      const admin=await clients[2].rpc("get_admin_platform_list",{p_kind:"properties",p_filters:{id:property}});expect(admin.error).toBeNull();expect(Number(admin.data.rows[0].reviews)).toBe(count);
      const feed=await clients[1].rpc("get_review_page",{p_property:property});expect(feed.error).toBeNull();expect(Number(feed.data.total)).toBe(count);
    }
    await assertScores(2,3);
    expect((await clients[0].rpc("delete_review",{p_review:reviews[0]})).error).toBeNull();await assertScores(1,4);
    expect((await clients[1].rpc("delete_review",{p_review:reviews[1]})).error).toBeNull();await assertScores(0,null);
    const history=await clients[2].rpc("get_admin_platform_list",{p_kind:"reviews",p_filters:{id:reviews[0]}});expect(history.data.rows[0].status).toBe("deleted");
  } finally {
    for(const id of ids){cleanupReviewUser(id);await service.auth.admin.deleteUser(id);}
    if(property)await service.from("properties").delete().eq("id",property);
  }
});
