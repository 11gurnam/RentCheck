import {test,expect} from "@playwright/test";
import {execFileSync} from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import {localBackendConfiguration} from "../helpers/local-backend";

test("numbered search pages preserve filters and disable unavailable directions",async({page},info)=>{
 test.setTimeout(90000);
 const config=localBackendConfiguration();if(!config)throw Error("Local backend required");
 const sql=(statement:string)=>execFileSync("docker",["exec","supabase_db_rentcheck-accounts-test","psql","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-c",statement],{stdio:"pipe"});
 const prefix=`Pagination ${crypto.randomUUID().slice(0,8)}`;
 const fixtures=Array.from({length:37},(_,i)=>({id:crypto.randomUUID(),name:`${prefix} ${String(i).padStart(2,"0")}`,address:`Fictional pagination address ${i}`,state:"Delhi",city:"Pagination city",locality:"Test area",property_type:"Flat",rent_min:1000,rent_max:2000,is_demo:true}));
 sql(`insert into public.properties(id,name,address,state,city,locality,property_type,rent_min,rent_max,is_demo) select id,name,address,state,city,locality,property_type,rent_min,rent_max,is_demo from jsonb_to_recordset('${JSON.stringify(fixtures).replaceAll("'","''")}'::jsonb) as p(id uuid,name text,address text,state text,city text,locality text,property_type text,rent_min integer,rent_max integer,is_demo boolean)`);
 const query=new URLSearchParams({q:prefix,type:"Flat",city:"Pagination city"});
 try{
  await page.goto(`/search?${query}`);const nav=page.getByRole("navigation",{name:"Results pages",exact:true});
  await expect(nav).toContainText("Page 1 of 4");await expect(nav.getByRole("button",{name:"Previous page",exact:true})).toBeDisabled();
  await expect(nav.locator('[aria-current="page"]')).toHaveText("1");await expect(page.locator(".property-card")).toHaveCount(12);
  await nav.getByRole("link",{name:"Next page",exact:true}).click();await expect(nav).toContainText("Page 2 of 4");
  expect(new URL(page.url()).searchParams.get("q")).toBe(prefix);expect(new URL(page.url()).searchParams.get("type")).toBe("Flat");expect(new URL(page.url()).searchParams.get("city")).toBe("Pagination city");
  await expect(nav.getByRole("link",{name:"Previous page",exact:true})).toBeVisible();await nav.getByRole("link",{name:"Go to page 4",exact:true}).click();
  await expect(nav).toContainText("Page 4 of 4");await expect(page.locator(".property-card")).toHaveCount(1);await expect(nav.getByRole("button",{name:"Next page",exact:true})).toBeDisabled();
  await expect(nav.locator('[aria-current="page"]')).toHaveText("4");await nav.getByRole("link",{name:"Previous page",exact:true}).click();await expect(nav).toContainText("Page 3 of 4");
  await page.goto(`/search?${query}&page=999`);await expect(nav).toContainText("Page 4 of 4");expect(new URL(page.url()).searchParams.get("page")).toBe("4");
  expect((await new AxeBuilder({page}).include(".numbered-pagination").withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
  await nav.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath("numbered-pagination.png")});
  await page.goto(`/search?q=No-results-${crypto.randomUUID()}`);await expect(nav.getByRole("button",{name:"Previous page",exact:true})).toBeDisabled();await expect(nav.getByRole("button",{name:"Next page",exact:true})).toBeDisabled();await expect(nav).toContainText("Page 1 of 1");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{sql(`delete from public.properties where id in (${fixtures.map(p=>`'${p.id}'`).join(",")})`);}
});
