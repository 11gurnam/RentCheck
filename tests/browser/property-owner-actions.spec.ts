import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import {localBackendConfiguration} from "../helpers/local-backend";
import {fixtureAdmin} from "../helpers/admin-fixture";
import {cleanupReviewUser} from "../helpers/review-cleanup";

test("property actions distinguish owners, pending claims, approval and visitors",async({page},info)=>{
 test.setTimeout(120000);
 const config=localBackendConfiguration();if(!config)throw Error("Local backend required");
 const service=createClient(config.url,config.serviceKey,{auth:{persistSession:false}});
 const password="Synthetic property actions password",users:string[]=[],clients:(typeof service)[]=[],emails:string[]=[];
 let property:string|undefined,path:string|undefined;
 try{
  for(let i=0;i<3;i++){
   const email=`owner-actions-${crypto.randomUUID()}@example.test`;
   const user=await service.auth.admin.createUser({email,password,email_confirm:true});expect(user.error).toBeNull();users.push(user.data.user!.id);emails.push(email);
   const client=createClient(config.url,config.publicKey,{auth:{persistSession:false}});expect((await client.auth.signInWithPassword({email,password})).error).toBeNull();clients.push(client);
  }
  const created=await clients[0].rpc("create_property",{p_input:{name:`Owner actions ${crypto.randomUUID().slice(0,6)}`,address:`Synthetic ownership lane ${crypto.randomUUID()}`,state:"Delhi",city:"New Delhi",locality:"Test neighbourhood",type:"Flat",min:10000,max:15000,synthetic:true,declaredOwner:true},p_acknowledged:true});expect(created.error).toBeNull();property=created.data;
  await page.goto("/sign-in");await page.getByLabel("Email address").fill(emails[0]);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page).toHaveURL(/\/account$/,{timeout:30000});
  const actions=page.locator('.property-actions[aria-label="Property actions"]');
  async function ownerActions(){
   for(const name of ["Save to shortlist","Write a review","Contact representative","Claim this property","Add review photos","Report this property"]){await expect(actions.getByRole("link",{name,exact:true})).toHaveCount(0);await expect(actions.getByRole("button",{name,exact:true})).toHaveCount(0);}
   await expect(page.getByRole("link",{name:"★ Leave Landlord Rating",exact:true})).toHaveCount(0);
  }
  await page.goto(`/properties/${property}`);await ownerActions();await expect(actions.getByRole("link",{name:"Verify property ownership"})).toBeVisible();
  const doc=crypto.randomUUID();path=`claim/${doc}.jpg`;expect((await service.storage.from("rental-documents").upload(path,new Uint8Array([1]),{contentType:"image/jpeg"})).error).toBeNull();
  const registered=await service.rpc("register_evidence_bundle",{p_user:users[0],p_documents:[{id:doc,extension:"jpg"}],p_kind:"ownership",p_property:property,p_demo:true,p_consent:true});expect(registered.error).toBeNull();
  await page.reload();await ownerActions();await expect(actions).toContainText("Claim awaiting review");await expect(actions.getByRole("link",{name:"View claim status"})).toHaveAttribute("href",`/claims#claim-${registered.data}`);await expect(actions.getByRole("link",{name:"Manage property",exact:true})).toHaveCount(0);
  await page.goto("/account/contact");await expect(page.getByLabel("Display this number publicly",{exact:false})).toBeDisabled();await page.getByLabel("Contact mobile number").fill("9000000001");await page.getByRole("button",{name:"Save contact details",exact:true}).click();await expect(page.locator(".success-toast")).toContainText("Contact details saved");expect((await clients[1].rpc("get_property_contact_numbers",{p_property:property})).data).toEqual([]);expect((await clients[1].rpc("set_property_contact_settings",{p_phone:"9000000002",p_show_publicly:true})).error).not.toBeNull();
  await page.goto(`/claims/new?kind=property&target=${property}`);await expect(page.getByText("Your claim has already been submitted.",{exact:false})).toBeVisible();await expect(page.getByRole("button",{name:"Submit demonstration claim"})).toHaveCount(0);
  fixtureAdmin(users[2],true);const decision={p_claim:registered.data,p_decision:"approved",p_reason:"Independent synthetic ownership review completed"};expect((await clients[2].rpc("decide_claim",decision)).error).toBeNull();
  await page.goto("/account/contact");await page.screenshot({path:info.outputPath("contact-settings.png"),fullPage:true});await page.getByLabel("Display this number publicly",{exact:false}).check();await page.getByRole("button",{name:"Save contact details",exact:true}).click();await expect(page.locator(".success-toast")).toContainText("Contact details saved");expect((await clients[1].rpc("get_property_contact_numbers",{p_property:property})).data).toHaveLength(1);
  await page.goto(`/properties/${property}`);await expect(page.getByRole("link",{name:/Call .*9000000001/})).toHaveAttribute("href","tel:+919000000001");await ownerActions();await expect(actions).toContainText("Demo claim approved");await expect(actions.getByRole("link",{name:"Manage property",exact:true})).toBeVisible();await expect(actions.getByRole("link",{name:"Manage property photos"})).toBeVisible();await page.screenshot({path:info.outputPath("approved-owner-actions.png"),fullPage:true});
  await actions.getByRole("link",{name:"Manage property",exact:true}).click();await expect(page).toHaveURL(new RegExp(`/claims#claim-${registered.data}$`));await expect(page.locator(`#claim-${registered.data}`).getByLabel("Profile name")).toBeVisible();
  expect((await clients[2].rpc("decide_claim",{...decision,p_decision:"disputed"})).error).toBeNull();await page.goto(`/properties/${property}`);await ownerActions();await expect(actions).toContainText("Claim disputed");await expect(page.getByRole("link",{name:/Call .*9000000001/})).toHaveCount(0);expect((await clients[1].rpc("get_property_contact_numbers",{p_property:property})).data).toEqual([]);expect((await clients[0].rpc("set_property_contact_settings",{p_phone:"invalid",p_show_publicly:false})).error).not.toBeNull();expect((await clients[0].rpc("set_property_contact_settings",{p_phone:"",p_show_publicly:false})).error).toBeNull();await expect(actions.getByRole("link",{name:"Manage property",exact:true})).toHaveCount(0);
  await page.context().clearCookies();await page.goto("/sign-in");await page.getByLabel("Email address").fill(emails[1]);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page).toHaveURL(/\/account$/,{timeout:30000});
  await page.goto(`/properties/${property}`);await expect(actions.getByRole("link",{name:"Write a review",exact:true})).toBeVisible();await expect(actions.getByRole("button",{name:"Report this property",exact:true})).toBeVisible();
  if(info.project.name==="phone")await page.getByRole("button",{name:"Menu",exact:true}).click();
  await page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"Explore",exact:true}).click();await expect(page).toHaveURL(/\/search$/,{timeout:30000});
  if(info.project.name==="phone")await page.getByRole("button",{name:"Menu",exact:true}).click();
  const explore=page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"Explore",exact:true});await explore.click();await expect(explore.locator(".navigation-pending.is-pending")).toHaveCount(0);
 }finally{
  if(path)await service.storage.from("rental-documents").remove([path]);
  for(const user of users){cleanupReviewUser(user);await service.auth.admin.deleteUser(user);}
  if(property)await service.from("properties").delete().eq("id",property);
 }
});
