import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
const config = localBackendConfiguration();
if (!config) throw new Error("Local backend required");
test("comparison limits selection to three and remains accessible", async ({ page }, info) => {
  await page.goto("/compare");
  const choices = page.getByRole("checkbox");
  expect(await choices.count()).toBeGreaterThan(3);
  for (let i = 0; i < 3; i++) await choices.nth(i).check();
  await expect(choices.nth(3)).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("3 of 3 selected.");
  await expect(page.locator(".comparison-grid article")).toHaveCount(3);
  await choices.nth(0).uncheck(); await expect(choices.nth(3)).toBeEnabled();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("property-comparison.png"), fullPage: true });
});
test("opt-in messaging, block/report moderation and explicit map coordinates work", async ({ page, browser }, info) => {
  test.setTimeout(100000);
  const c = config!, service = createClient(c.url, c.serviceKey, { auth: { persistSession: false } });
  const users: string[] = [], clients = [], emails: string[] = [];
  const password = "Synthetic messaging browser passphrase";
  let property: string | undefined, path: string | undefined;
  const otherContext = await browser.newContext({ baseURL: "http://127.0.0.1:3000" });
  const tenantPage = await otherContext.newPage();
  try {
    for (const alias of ["MessagingRepresentative", "MessagingTenant"]) {
      const email = `messaging-browser-${crypto.randomUUID()}@example.test`;
      const u = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { public_alias: alias } });
      expect(u.error).toBeNull(); users.push(u.data.user!.id); emails.push(email);
      const client = createClient(c.url, c.publicKey, { auth: { persistSession: false } });
      expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull(); clients.push(client);
    }
    const created = await clients[0].rpc("create_property", { p_input: { name: "Synthetic messaging " + crypto.randomUUID().slice(0, 8), address: "Synthetic contact lane " + crypto.randomUUID(), state: "Delhi", city: "Messaging city", locality: "Fixture area", type: "Flat", min: 1000, max: 2000, description: "Fictional contact fixture", synthetic: true, declaredOwner: true }, p_acknowledged: true });
    expect(created.error).toBeNull(); property = created.data;
    const fixtureDocument = crypto.randomUUID(); path = `claim/${fixtureDocument}.jpg`;
    const jpeg = await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } }).jpeg().toBuffer();
    expect((await service.storage.from("rental-documents").upload(path, jpeg, { contentType: "image/jpeg" })).error).toBeNull();
    const claim = await service.rpc("register_evidence_document", { p_user: users[0], p_document: fixtureDocument, p_extension: "jpg", p_property: property }); expect(claim.error).toBeNull();
    fixtureAdmin(users[0], true);
    expect((await clients[0].rpc("decide_claim", { p_claim: claim.data, p_decision: "approved", p_reason: "Synthetic messaging approval" })).error).toBeNull();
    for (const [i, target] of [page, tenantPage].entries()) {
      await target.goto("/sign-in"); await target.getByLabel("Email address").fill(emails[i]); await target.getByLabel("Password", { exact: true }).fill(password); await target.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(target).toHaveURL(/\/account$/);
    }
    await tenantPage.goto(`/properties/${property}`); await expect(tenantPage.getByText("No approved representative is currently accepting contact")).toBeVisible();
    await page.goto("/messages"); await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Save contact preference" }).click(); await expect(page.getByRole("status")).toHaveText("Contact preference saved.");
    await tenantPage.reload(); await tenantPage.getByRole("checkbox", { name: "I agree to private contact" }).check(); await tenantPage.getByRole("button", { name: "Start conversation" }).click(); await expect(tenantPage).toHaveURL(/\/messages\/[a-f0-9-]+$/);
    const conversationUrl = tenantPage.url();
    await tenantPage.getByLabel("Your message").fill("Synthetic question about the property <script>literal text</script>"); await tenantPage.getByRole("button", { name: "Send message" }).click(); await expect(tenantPage.getByText("Message sent.")).toBeVisible();
    await page.goto(conversationUrl); await expect(page.locator(".message-body")).toContainText("<script>literal text</script>");
    await page.getByLabel("Your message").fill("Synthetic representative answer"); await page.getByRole("button", { name: "Send message" }).click(); await expect(page.getByText("Message sent.")).toBeVisible();
    await tenantPage.reload(); await expect(tenantPage.getByText("Synthetic representative answer", { exact: true })).toBeVisible();
    await tenantPage.getByRole("button", { name: "Block conversation" }).click(); await expect(tenantPage.getByText("Messaging paused.")).toBeVisible();
    await page.reload(); await expect(page.getByText("Messaging paused.")).toBeVisible();
    await tenantPage.getByRole("button", { name: "Unblock conversation" }).click(); await expect(tenantPage.getByRole("button", { name: "Send message" })).toBeVisible();
    await tenantPage.getByText("Report this message", { exact: true }).click(); await tenantPage.getByLabel("Message report reason").fill("Synthetic report for browser moderation"); await tenantPage.getByRole("button", { name: "Report message", exact: true }).click(); await expect(tenantPage.getByText("Report submitted for administrator review.")).toBeVisible();
    expect((await new AxeBuilder({ page: tenantPage }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await tenantPage.screenshot({ path: info.outputPath("private-conversation.png"), fullPage: true });
    await page.goto("/admin/messages"); const report = page.locator("article").filter({ hasText: "Synthetic report for browser moderation" }); await report.getByLabel("Message decision").selectOption("removed"); await report.getByLabel("Decision reason").fill("Synthetic message moderation decision"); await report.getByRole("button", { name: "Save message decision" }).click(); await expect(report.getByRole("heading", { name: "removed", exact: true })).toBeVisible();
    await tenantPage.reload(); await expect(tenantPage.getByText("[Removed following moderation]", { exact: true })).toBeVisible();
    await page.goto("/admin/locations"); await page.getByRole("combobox", { name: "Property", exact: true }).selectOption(property!); await page.getByLabel("Latitude", { exact: true }).fill("28.61"); await page.getByLabel("Longitude", { exact: true }).fill("77.21"); await page.getByLabel("Coordinate source and audit reason").fill("Synthetic fictional coordinate fixture"); await page.getByRole("button", { name: "Save recorded location" }).click(); await expect(page.getByRole("status")).toContainText("updated and audited");
    await page.goto("/map"); await page.getByLabel("Recorded property location").selectOption(property!); await expect(page.getByText("Approximate location:", { exact: false })).toBeVisible(); await expect(page.locator("iframe")).toHaveCount(0);
    await page.route("https://www.openstreetmap.org/**", route => route.fulfill({ contentType: "text/html", body: "<p>Map provider test fixture</p>" }));
    await page.getByRole("button", { name: "Load OpenStreetMap" }).click(); await expect(page.locator("iframe")).toHaveAttribute("src", /marker=28.61%2C77.21/);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("recorded-map.png"), fullPage: true });
    fixtureAdmin(users[0], false);
    expect((await clients[0].rpc("set_contact_preference", { p_enabled: false })).error).toBeNull();
    await tenantPage.goto(conversationUrl); await expect(tenantPage.getByText("Messaging paused.")).toBeVisible();
  } finally {
    await otherContext.close();
    for (const user of users) expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    if (path) await service.storage.from("rental-documents").remove([path]);
    if (property) { await service.from("property_locations").delete().eq("property_id", property); await service.from("properties").delete().eq("id", property); }
  }
});
