import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
import { localBackendConfiguration } from "../helpers/local-backend";
import { cleanupReviewUser } from "../helpers/review-cleanup";

test("profile photo preview, confirmed upload, failure preservation, shortlist defaults and PDF claim", async ({page},info) => {
  test.setTimeout(180000);
  const config=localBackendConfiguration();if(!config)throw Error("Local backend required");
  const service=createClient(config.url,config.serviceKey,{auth:{persistSession:false}});
  const email=`profile-claim-${crypto.randomUUID()}@example.test`,password="Synthetic profile claim password";
  const user=await service.auth.admin.createUser({email,password,email_confirm:true});expect(user.error).toBeNull();
  const client=createClient(config.url,config.publicKey,{auth:{persistSession:false}});await client.auth.signInWithPassword({email,password});
  let property:string|undefined;
  try {
    await page.goto("/sign-in");await page.getByLabel("Email address").fill(email);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page).toHaveURL(/\/account$/);
    await page.getByRole("button",{name:"Upload photo",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Profile photo",exact:true});
    await expect(dialog.getByText("Current profile photo")).toBeVisible();
    const png=await sharp({create:{width:160,height:120,channels:3,background:"green"}}).png().toBuffer();
    await dialog.locator('input[type="file"]').setInputFiles({name:"profile.png",mimeType:"image/png",buffer:png});await expect(dialog.getByAltText("Selected photo preview")).toBeVisible();
    await dialog.getByRole("button",{name:"Cancel",exact:true}).click();await expect(dialog).not.toBeVisible();
    await page.getByRole("button",{name:"Upload photo",exact:true}).click();await expect(dialog.getByAltText("Selected photo preview")).toHaveCount(0);
    await dialog.locator('input[type="file"]').setInputFiles({name:"profile.png",mimeType:"image/png",buffer:png});await dialog.getByRole("button",{name:"Save photo",exact:true}).click();
    await expect(page.locator(".success-toast")).toContainText("Profile photo updated");await expect(dialog).not.toBeVisible();
    const image=page.locator(".profile-photo-trigger img");await expect(image).toBeVisible();const original=await image.getAttribute("src");
    await page.getByRole("button",{name:"Change photo",exact:true}).click();await dialog.locator('input[type="file"]').setInputFiles({name:"invalid.png",mimeType:"image/png",buffer:Buffer.from("not an image")});await dialog.getByRole("button",{name:"Save photo",exact:true}).click();await expect(dialog.getByRole("alert")).toBeVisible();await expect(image).toHaveAttribute("src",original!);await expect(dialog).toBeVisible();await dialog.getByRole("button",{name:"Cancel",exact:true}).click();
    await page.route("**/account",route=>route.request().method()==="POST"?route.fulfill({status:503,contentType:"text/plain",body:"Temporarily unavailable"}):route.continue());
    await page.getByRole("button",{name:"Change photo",exact:true}).click();await dialog.locator('input[type="file"]').setInputFiles({name:"profile.png",mimeType:"image/png",buffer:png});await dialog.getByRole("button",{name:"Save photo",exact:true}).click();await expect(dialog.getByRole("alert")).toContainText("interrupted");await expect(image).toHaveAttribute("src",original!);await dialog.getByRole("button",{name:"Cancel",exact:true}).click();await page.unroute("**/account");
    const created=await client.rpc("create_property",{p_input:{name:`Synthetic PDF claim ${crypto.randomUUID().slice(0,6)}`,address:`PDF claim lane ${crypto.randomUUID()}`,state:"Delhi",city:"New Delhi",locality:"Test area",type:"Flat",min:1000,max:2000,synthetic:true},p_acknowledged:true});expect(created.error).toBeNull();property=created.data;
    expect((await client.rpc("set_saved_property",{p_property:property,p_saved:true})).error).toBeNull();
    await page.goto("/compare");await expect(page.locator(".compare-selected-place")).toHaveCount(1);await page.locator(".compare-selected-place").getByRole("button").click();await expect(page.locator(".compare-selected-place")).toHaveCount(0);
    await page.goto(`/claims/new?kind=property&target=${property}`);const doc=await PDFDocument.create();doc.addPage().drawText("Fictional ownership evidence for automated tests only.");
    await page.getByLabel("Fictional supporting documents").setInputFiles({name:"invalid.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.7 invalid")});await page.getByLabel("This claim and evidence use only").check();await page.getByRole("button",{name:"Submit demonstration claim",exact:true}).click();await expect(page.getByRole("main").getByRole("alert")).toContainText("readable");await expect(page.getByText("invalid.pdf",{exact:true})).toBeVisible();
    await page.getByLabel("Fictional supporting documents").setInputFiles({name:"ownership.pdf",mimeType:"application/pdf",buffer:Buffer.from(await doc.save())});await page.getByLabel("This claim and evidence use only").check();await page.getByRole("button",{name:"Submit demonstration claim",exact:true}).click();await expect(page.locator(".success-toast")).toContainText("claim submitted");
    await page.goto("/claims");await expect(page.locator(".claim-card .semantic-status")).toContainText("Awaiting review");await expect(page.locator(".claim-address")).toContainText("Property address");await expect(page.getByRole("heading",{name:"Private supporting documents"})).toBeVisible();await expect(page.getByRole("link",{name:"View property",exact:true})).toBeVisible();const link=page.getByRole("link",{name:/Download private document/}).first();expect((await page.request.get((await link.getAttribute("href"))!)).status()).toBe(200);
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);await page.screenshot({path:info.outputPath(`claims-${width}.png`),fullPage:true});}
    const review=await client.rpc("create_review",{p_input:{property,start:"2024-01-01",current:true,paid:1500,propertyRating:4,body:"Synthetic review for modal confirmation checks.",synthetic:true}});expect(review.error).toBeNull();
    await page.goto(`/properties/${property}`);const card=page.locator(`#review-${review.data.id}`);await card.getByRole("button",{name:"Report this review",exact:true}).click();const report=page.getByRole("dialog",{name:"Report this review",exact:true});await report.getByLabel("Report reason",{exact:true}).fill("Synthetic report to test confirmation feedback.");await report.getByRole("button",{name:"Submit report",exact:true}).click();await expect(page.locator(".success-toast")).toContainText("Report submitted");await expect(report).not.toBeVisible();
    await page.goto("/account/reviews");await page.getByRole("button",{name:"Delete review",exact:true}).click();const deletion=page.getByRole("dialog",{name:"Delete this review?",exact:true});await deletion.getByRole("button",{name:"Confirm delete",exact:true}).click();await expect(page.locator(".success-toast")).toContainText("Review deleted");await expect(deletion).not.toBeVisible();
    await page.goto(`/properties/${property}`);await expect(page.locator(`#review-${review.data.id}`)).toHaveCount(0);await expect(page.getByText("No reviews yet. Be the first to share your experience.",{exact:false})).toBeVisible();
  } finally {
    cleanupReviewUser(user.data.user!.id);
    await service.auth.admin.deleteUser(user.data.user!.id);
    if(property)await service.from("properties").delete().eq("id",property);
  }
});
