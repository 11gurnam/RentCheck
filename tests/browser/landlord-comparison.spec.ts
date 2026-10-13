import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import {localBackendConfiguration} from "../helpers/local-backend";
import {cleanupReviewUser} from "../helpers/review-cleanup";
test("comparison displays the current landlord score separately from the property score",async({page})=>{
  const c=localBackendConfiguration();if(!c)throw Error("Local backend required");
  const admin=createClient(c.url,c.serviceKey,{auth:{persistSession:false}}),client=createClient(c.url,c.publicKey,{auth:{persistSession:false}});
  const password="Synthetic landlord comparison password",email=`landlord-score-${crypto.randomUUID()}@example.test`;
  const u=await admin.auth.admin.createUser({email,password,email_confirm:true});expect(u.error).toBeNull();
  try{
    expect((await client.auth.signInWithPassword({email,password})).error).toBeNull();
    const property="20000000-0000-4000-8000-000000000005";
    const review=await client.rpc("create_review",{p_input:{property,start:"2025-03-01",end:"",current:true,paid:10000,propertyRating:2,managerRating:4,body:"A fictional rating fixture with different property and landlord scores.",synthetic:true}});expect(review.error).toBeNull();
    const expected=await client.from("landlord_scores").select("landlord_rating,review_count").eq("landlord_id","10000000-0000-4000-8000-000000000005").single();expect(expected.error).toBeNull();
    await page.goto("/compare");for(const name of ["Demo Rose Studio","Demo Neem Courtyard"]){await page.getByRole("button",{name:/Add a place/}).click();await page.getByLabel("Find a place").fill(name);await page.getByRole("button",{name:new RegExp(name)}).click();}
    const landlordRow=page.getByRole("row",{name:/^Landlord \/ management rating/});await expect(landlordRow).toContainText(`${Number(expected.data!.landlord_rating).toFixed(1)} / 5`);
    await expect(page.getByRole("row",{name:/^Tenant rating/})).toContainText("2.0 / 5");
    await page.goto("/properties/"+property);await expect(page.locator(".manager-score")).toContainText(`${Number(expected.data!.landlord_rating).toFixed(1)} / 5`);
  }finally{if(u.data.user){cleanupReviewUser(u.data.user.id);await admin.auth.admin.deleteUser(u.data.user.id);}}
});
