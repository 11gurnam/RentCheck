import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
import {fixtureAdmin} from "../helpers/admin-fixture";
import {cleanupReviewUser} from "../helpers/review-cleanup";
import {localBackendConfiguration} from "../helpers/local-backend";

test("admin actions use an accessible unclipped menu and navigation has centered loading",async({page},info)=>{
 test.setTimeout(120000);
 const config=localBackendConfiguration();if(!config)throw Error("Local backend required");
 const service=createClient(config.url,config.serviceKey,{auth:{persistSession:false}}),users:string[]=[],password="Synthetic admin menu password";
 let property:string|undefined,path:string|undefined;
 try{
  const clients:(typeof service)[]=[],emails:string[]=[];
  for(let i=0;i<2;i++){const email=`admin-menu-${crypto.randomUUID()}@example.test`;const user=await service.auth.admin.createUser({email,password,email_confirm:true});expect(user.error).toBeNull();users.push(user.data.user!.id);emails.push(email);const client=createClient(config.url,config.publicKey,{auth:{persistSession:false}});await client.auth.signInWithPassword({email,password});clients.push(client);}
  fixtureAdmin(users[1],true);const name=`Action menu ${crypto.randomUUID().slice(0,8)}`;
  const created=await clients[1].rpc("create_property",{p_input:{name,address:`Synthetic menu lane ${crypto.randomUUID()}`,state:"Delhi",city:"New Delhi",locality:"Test area",type:"Flat",min:10000,max:12000,synthetic:true},p_acknowledged:true});expect(created.error).toBeNull();property=created.data;
  const review=await clients[0].rpc("create_review",{p_input:{property,start:"2024-01-01",current:true,paid:10000,propertyRating:4,body:"Synthetic review to exercise administrative menu navigation.",synthetic:true}});expect(review.error).toBeNull();
  const doc=crypto.randomUUID();path=`verification/${doc}.jpg`;expect((await service.storage.from("rental-documents").upload(path,await sharp({create:{width:200,height:160,channels:3,background:"white"}}).jpeg().toBuffer(),{contentType:"image/jpeg"})).error).toBeNull();
  const application=await service.rpc("register_evidence_bundle",{p_user:users[0],p_documents:[{id:doc,extension:"jpg"}],p_kind:"lease",p_review:review.data.id,p_demo:true,p_consent:true});expect(application.error).toBeNull();
  await page.goto("/sign-in");await page.getByLabel("Email address").fill(emails[1]);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page).toHaveURL(/\/account$/,{timeout:30000});
  await page.goto("/admin");
  await page.route("**/admin/verification-management?type=tenant**",async route=>{await new Promise(resolve=>setTimeout(resolve,1500));await route.continue();});
  await page.getByRole("navigation",{name:"Admin navigation"}).getByRole("link",{name:/Tenant Verification/}).click();
  await expect(page.locator(".navigation-loading-backdrop")).toBeVisible();const box=await page.locator(".navigation-loading-card").boundingBox();const viewport=page.viewportSize()!;expect(Math.abs(box!.x+box!.width/2-viewport.width/2)).toBeLessThan(2);expect(Math.abs(box!.y+box!.height/2-viewport.height/2)).toBeLessThan(2);
  await expect(page.locator(".navigation-loading-backdrop")).toHaveCount(0,{timeout:30000});await page.unroute("**/admin/verification-management?type=tenant**");
  await page.getByLabel("Search applications").fill(name);await page.getByRole("button",{name:"Search",exact:true}).click();
  const row=page.getByRole("row").filter({hasText:name});await expect(row).toHaveCount(1);
  const trigger=row.getByRole("button",{name:/Actions for/});await trigger.click();const menu=page.locator(".verification-actions-popover:popover-open");await expect(menu).toBeVisible();await expect(trigger).toHaveText("");
  for(const label of ["View Details","Approve application","Reject application","Request more information"])await expect(menu.getByRole("link",{name:label,exact:true})).toBeVisible();
  const bounds=await menu.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width);
  await page.screenshot({path:info.outputPath("verification-action-menu.png"),fullPage:true});
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
  await menu.getByRole("link",{name:"Reject application",exact:true}).click();await expect(page.getByRole("combobox",{name:"Administrative action"})).toHaveValue("rejected",{timeout:30000});
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();await expect(page.getByLabel("Document zoom")).toHaveText("125%");await page.getByRole("button",{name:"Zoom out",exact:true}).click();await expect(page.getByLabel("Document zoom")).toHaveText("100%");await expect(page.getByRole("link",{name:"Open original",exact:true})).toBeVisible();
  await page.goBack();await trigger.click();await page.keyboard.press("Escape");await expect(menu).toHaveCount(0);
  if(info.project.name==="desktop"){await page.mouse.move(0,0);await trigger.hover();await expect(menu).toBeVisible();await page.mouse.move(0,0);await expect(menu).toHaveCount(0);}
 }finally{if(path)await service.storage.from("rental-documents").remove([path]);for(const user of users){cleanupReviewUser(user);await service.auth.admin.deleteUser(user);}if(property)await service.from("properties").delete().eq("id",property);}
});
