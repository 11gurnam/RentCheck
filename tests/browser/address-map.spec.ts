import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import {localBackendConfiguration} from "../helpers/local-backend";
test("address dropdowns, current location, PIN fill and saved map work together",async({page,context},info)=>{
  test.setTimeout(90000);
  const c=localBackendConfiguration();if(!c)throw Error("Local backend required");
  const admin=createClient(c.url,c.serviceKey,{auth:{persistSession:false}});
  const email=`browser-map-${crypto.randomUUID()}@example.test`,password="Synthetic map check password";
  const user=await admin.auth.admin.createUser({email,password,email_confirm:true});expect(user.error).toBeNull();
  let property:string|undefined;
  try{
    await context.grantPermissions(["geolocation"]);await context.setGeolocation({latitude:26.918,longitude:75.787});
    await page.route("https://tile.openstreetmap.org/**",route=>route.abort());
    await page.route("**/api/address?**",route=>route.fulfill({json:{results:[{address:`Demo Address ${crypto.randomUUID().slice(0,8)}, Civil Lines`,city:"Jaipur",state:"Rajasthan",locality:"Civil Lines",postalCode:"302006",latitude:26.918,longitude:75.787}]}}));
    await page.goto("/sign-in");await page.getByLabel("Email address").fill(email);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page).toHaveURL(/\/account$/,{timeout:20000});
    await page.goto("/properties/new");await expect(page.getByLabel("City",{exact:true})).toBeDisabled();
    await page.getByLabel("State / union territory").selectOption("Rajasthan");await page.getByLabel("City",{exact:true}).fill("Jaipur");await page.getByLabel("PIN code",{exact:true}).fill("302006");
    await page.getByLabel("State / union territory").selectOption("Maharashtra");await expect(page.getByLabel("City",{exact:true})).toHaveValue("");await expect(page.getByLabel("PIN code",{exact:true})).toHaveValue("");
    await expect(page.getByRole("region",{name:"Choose property location on map"})).toHaveCount(0);
    await page.getByRole("button",{name:"Choose location on map"}).click();await page.getByRole("button",{name:"Use my location"}).click();
    await expect(page.getByLabel("Latitude",{exact:true})).toHaveValue("26.918");
    await expect(page.getByLabel("Country",{exact:true})).toHaveValue("India");
    await expect(page.getByLabel("City",{exact:true})).toHaveValue("Jaipur");await expect(page.getByLabel("PIN code",{exact:true})).toHaveValue("302006");
    await expect(page.getByLabel("Show this property pin")).not.toBeChecked();await page.getByLabel("Show this property pin").check();
    const name=`Demo map ${crypto.randomUUID().slice(0,8)}`;
    await page.getByLabel("Property name").fill(name);await page.getByLabel("Minimum monthly rent (₹)").fill("10000");await page.getByLabel("Maximum monthly rent (₹)").fill("15000");await page.getByLabel("All details are fictional").check();
    const axe=await new AxeBuilder({page}).exclude(".pin-map").withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(axe.violations).toEqual([]);
    await page.screenshot({path:info.outputPath("add-place-map.png"),fullPage:true});
    await page.getByRole("button",{name:"Add demo property"}).click();await expect(page.getByRole("button",{name:"Add demo property"})).toBeEnabled();const duplicateAcknowledgment=page.getByLabel("I checked these profiles");if(await duplicateAcknowledgment.isVisible()){await duplicateAcknowledgment.check();await page.getByRole("button",{name:"Add demo property"}).click();}await expect(page.getByRole("heading",{level:1})).toHaveText(name,{timeout:20000});property=page.url().split("/").at(-1);
    await expect(page.getByText(/PIN 302006/)).toBeVisible();await expect(page.getByRole("link",{name:`Open ${name} in Google Maps`})).toHaveAttribute("href",/query=26\.918%2C75\.787/);
    await page.getByRole("button",{name:"Show location map"}).click();await expect(page.getByRole("region",{name:"Property location map"})).toBeVisible();await page.reload();await expect(page.getByText(/PIN 302006/)).toBeVisible();
    await page.goto("/map");await page.getByLabel("Choose a place").selectOption(property!);await expect(page.getByText("26.918, 75.787",{exact:false})).toBeVisible();
    await page.goto("/compare");await page.getByRole("button",{name:/Add a place/}).click();await page.getByLabel("Find a place").fill(name);await page.getByRole("button",{name:new RegExp(name)}).click();await page.getByRole("button",{name:/Add a place/}).click();await page.getByLabel("Find a place").fill("Neem");await page.getByRole("button",{name:/Demo Neem Courtyard/}).click();await expect(page.getByRole("rowheader",{name:"Map location",exact:true})).toBeVisible();await expect(page.getByRole("link",{name:`Open ${name} in Google Maps`})).toHaveAttribute("href",/query=26\.918%2C75\.787/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{if(property)await admin.from("properties").delete().eq("id",property);if(user.data.user)await admin.auth.admin.deleteUser(user.data.user.id);}
});
test("moving the pin ignores stale lookups and leaves missing address fields editable",async({page,context})=>{
  test.setTimeout(90000);
  const c=localBackendConfiguration();if(!c)throw Error("Local backend required");
  const service=createClient(c.url,c.serviceKey,{auth:{persistSession:false}});
  const email=`pin-update-${crypto.randomUUID()}@example.test`,password="Synthetic map update password";
  const user=await service.auth.admin.createUser({email,password,email_confirm:true});expect(user.error).toBeNull();
  let calls=0;
  try {
    await context.grantPermissions(["geolocation"]);await context.setGeolocation({latitude:26.918,longitude:75.787});await page.route("https://tile.openstreetmap.org/**",route=>route.abort());
    await page.route("**/api/address?**",async route=>{
      const number=++calls;if(number===1)await new Promise(resolve=>setTimeout(resolve,800));
      await route.fulfill({json:{results:[{address:number===1?"Old delayed address":"New selected address",city:"",state:number===1?"Rajasthan":"Tamil Nadu",locality:"",postalCode:"",latitude:26.918,longitude:75.787}]}}).catch(()=>{});
    });
    await page.goto("/sign-in");await page.getByLabel("Email address").fill(email);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page).toHaveURL(/\/account$/,{timeout:20000});
    await page.goto("/properties/new");await page.getByRole("button",{name:"Choose location on map"}).click();await page.getByRole("button",{name:"Use my location"}).click();
    await expect.poll(()=>calls).toBe(1);await page.getByRole("region",{name:"Choose property location on map"}).click({position:{x:70,y:100}});
    await expect(page.getByLabel("Full demo address",{exact:true})).toHaveValue("New selected address");await expect(page.getByLabel("PIN code",{exact:true})).toHaveValue("");await page.getByLabel("City",{exact:true}).fill("Chennai");await page.getByLabel("PIN code",{exact:true}).fill("600001");await expect(page.getByLabel("Latitude",{exact:true})).not.toHaveValue("");await expect(page.getByLabel("Longitude",{exact:true})).not.toHaveValue("");
    await expect(page.getByLabel("Full demo address",{exact:true})).toHaveValue("New selected address");await expect(page.getByLabel("Country",{exact:true})).toHaveValue("India");
  } finally {if(user.data.user)await service.auth.admin.deleteUser(user.data.user.id);}
});
