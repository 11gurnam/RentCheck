import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import {localBackendConfiguration} from "../helpers/local-backend";

test("map explorer searches, filters, selects pins and preserves external map links",async({page},info)=>{
 test.setTimeout(90000);
 const config=localBackendConfiguration();if(!config)throw Error("Local backend required");
 const admin=createClient(config.url,config.serviceKey,{auth:{persistSession:false}}),client=createClient(config.url,config.publicKey,{auth:{persistSession:false}});
 const email=`map-explorer-${crypto.randomUUID()}@example.test`,password="Synthetic map explorer password";
 const user=await admin.auth.admin.createUser({email,password,email_confirm:true});expect(user.error).toBeNull();await client.auth.signInWithPassword({email,password});
 const prefix=`Explorer ${crypto.randomUUID().slice(0,6)}`,ids:string[]=[];
 try{
  for(const [i,city,state,type,latitude,longitude] of [[0,"Jaipur","Rajasthan","Flat",26.918,75.787],[1,"New Delhi","Delhi","House",28.62,77.21]] as const){
   const result=await client.rpc("create_property",{p_input:{name:`${prefix} ${i}`,address:`Synthetic explorer lane ${crypto.randomUUID()}`,state,city,locality:"Test neighbourhood",type,min:10000,max:15000,synthetic:true,latitude,longitude,shareLocation:true},p_acknowledged:true});expect(result.error).toBeNull();ids.push(result.data);
  }
  const withoutPin=await client.rpc("create_property",{p_input:{name:`${prefix} address only`,address:`Synthetic unpinned lane ${crypto.randomUUID()}`,state:"Tamil Nadu",city:"Chennai",locality:"Test neighbourhood",type:"Flat",min:10000,max:15000,synthetic:true,shareLocation:false},p_acknowledged:true});expect(withoutPin.error).toBeNull();ids.push(withoutPin.data);
  let tileRequests=0;await page.route("https://tile.openstreetmap.org/**",route=>{tileRequests++;return route.abort();});
  await page.goto("/map");await expect(page.getByRole("heading",{level:1})).toContainText("Explore its surroundings");
  expect(tileRequests).toBe(0);await page.getByRole("searchbox",{name:"Search places"}).fill(prefix);await expect(page.locator(".map-property-option")).toHaveCount(3);
  await page.getByRole("combobox",{name:"City",exact:true}).selectOption("Chennai");await expect(page.locator(".map-property-option")).toHaveCount(1);
  await expect(page.getByText("No map pin shared yet.",{exact:false})).toBeVisible();
  await expect(page.getByRole("link",{name:`Open ${prefix} address only in Google Maps`,exact:true})).toHaveAttribute("href",/query=Synthetic%20unpinned%20lane/);
  await page.getByRole("combobox",{name:"City",exact:true}).selectOption("");
  await page.getByRole("checkbox",{name:"With map pins only"}).check();await expect(page.locator(".map-property-option")).toHaveCount(2);await page.getByRole("checkbox",{name:"With map pins only"}).uncheck();
  await page.getByRole("combobox",{name:"City",exact:true}).selectOption("Jaipur");await expect(page.locator(".map-property-option")).toHaveCount(1);
  await page.getByRole("button",{name:"Clear filters",exact:true}).click();await page.getByRole("searchbox",{name:"Search places"}).fill(prefix);
  await page.getByRole("combobox",{name:"Property type",exact:true}).selectOption("House");await expect(page.locator(".map-property-option")).toHaveCount(1);
  await page.getByRole("button",{name:"Clear filters",exact:true}).click();await page.getByRole("searchbox",{name:"Search places"}).fill(prefix);
  await page.getByLabel("Choose a place").selectOption(ids[0]);await page.screenshot({path:info.outputPath("map-explorer-preview.png"),fullPage:true});
  await page.getByRole("button",{name:"Load OpenStreetMap",exact:true}).click();await expect(page.locator(".leaflet-interactive")).toHaveCount(2);
  await page.getByRole("button",{name:"Show all pins",exact:true}).click();await page.locator('.leaflet-interactive[fill="#214f42"]').click();
  await expect(page.getByLabel("Choose a place")).toHaveValue(ids[1]);await expect(page.getByRole("link",{name:`Open ${prefix} 1 in Google Maps`,exact:true})).toHaveAttribute("href",/query=28\.62%2C77\.21/);
  await expect(page.getByRole("link",{name:"View property",exact:true})).toHaveAttribute("href",`/properties/${ids[1]}`);
  await page.getByLabel("Choose a place").selectOption(ids[0]);await expect(page.locator(".map-selected-heading h2")).toHaveText(`${prefix} 0`);
  await page.getByRole("button",{name:"Hide map",exact:true}).click();await expect(page.getByRole("region",{name:"Property location map"})).toHaveCount(0);
  await page.getByRole("searchbox",{name:"Search places"}).fill("No matching invented address 987654321");await expect(page.getByRole("heading",{name:"No matching places",exact:true})).toBeVisible();await page.getByRole("button",{name:"Clear filters",exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
 }finally{for(const id of ids)await admin.from("properties").delete().eq("id",id);if(user.data.user)await admin.auth.admin.deleteUser(user.data.user.id);}
});
