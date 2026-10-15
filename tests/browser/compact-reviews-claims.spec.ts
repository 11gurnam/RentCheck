import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import {localBackendConfiguration} from "../helpers/local-backend";
import {cleanupReviewUser} from "../helpers/review-cleanup";

test("claim catalogue appears immediately and reviews retain compact controls",async({page},info)=>{
 test.setTimeout(60000);
 const config=localBackendConfiguration();if(!config)throw Error("Local backend required");
 const admin=createClient(config.url,config.serviceKey,{auth:{persistSession:false}});
 const email=`compact-review-${crypto.randomUUID()}@example.test`,password="Synthetic compact review password";
 const user=await admin.auth.admin.createUser({email,password,email_confirm:true});expect(user.error).toBeNull();
 const client=createClient(config.url,config.publicKey,{auth:{persistSession:false}});await client.auth.signInWithPassword({email,password});
 try{
  const catalogue=await client.from("property_discovery").select("id,name");expect(catalogue.error).toBeNull();
  const review=await client.rpc("create_review",{p_input:{property:"20000000-0000-4000-8000-000000000003",start:"2026-01-01",current:true,paid:1500,propertyRating:4,managerRating:5,body:"A fictional experience with useful feedback. ".repeat(8),synthetic:true}});expect(review.error).toBeNull();
  await page.goto("/sign-in");await page.getByLabel("Email address").fill(email);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page).toHaveURL(/\/account$/,{timeout:30000});
  await page.goto("/claims/new");await expect(page.locator(".claim-search-result")).toHaveCount(catalogue.data!.length);
  await page.getByRole("textbox",{name:"Property name or address"}).fill("Garden");await page.getByRole("button",{name:"Search",exact:true}).click();await expect(page.locator(".claim-search-result")).toHaveCount(catalogue.data!.filter(p=>p.name.includes("Garden")).length);
  await page.getByRole("textbox",{name:"Property name or address"}).fill("");await page.getByRole("button",{name:"Search",exact:true}).click();await expect(page.locator(".claim-search-result")).toHaveCount(catalogue.data!.length);
  await page.screenshot({path:info.outputPath("claim-catalogue.png"),fullPage:true});
  await page.goto("/account/reviews");const card=page.locator(".own-review-card");await expect(card).toHaveCount(1);
  expect(await card.locator(".review-description h4").evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(13);
  expect((await card.boundingBox())!.height).toBeLessThan(440);
  await card.getByText("Read full review",{exact:true}).click();await expect(card.locator(".review-full-text p")).toBeVisible();await card.getByText("Read full review",{exact:true}).click();
  await expect(card.getByRole("link",{name:"Edit review",exact:true})).toBeVisible();await expect(card.getByRole("button",{name:"Delete review",exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath("compact-review.png"),fullPage:true});
  await card.getByRole("link",{name:"Edit review",exact:true}).click();const landlord=page.locator("#manager-rating");await expect(landlord).toBeVisible();
  expect(await landlord.locator(".landlord-stars").evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe("0px");
  await landlord.getByRole("button",{name:"Leave landlord unrated",exact:true}).click();await expect(landlord.locator('input[name="managerRating"]')).toHaveValue("");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{if(user.data.user){cleanupReviewUser(user.data.user.id);await admin.auth.admin.deleteUser(user.data.user.id);}}
});
