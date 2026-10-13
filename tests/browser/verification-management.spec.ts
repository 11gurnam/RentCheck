import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
test("management queue, private details, information request, applicant response and approval", async ({ page, browser }, info) => {
  test.setTimeout(120000);
  const c = localBackendConfiguration(); if (!c) throw new Error("Local backend required");
  const service = createClient(c.url, c.serviceKey, { auth: { persistSession: false } });
  const users: { id: string; email: string }[] = [], paths: string[] = [];
  const password = "Synthetic management browser password", name = "Management browser " + crypto.randomUUID().slice(0, 8);
  const tenantContext = await browser.newContext(); const tenantPage = await tenantContext.newPage();
  let property: string | undefined;
  async function login(p: typeof page, email: string) { await p.goto("/sign-in"); await p.getByLabel("Email address").fill(email); await p.getByLabel("Password", { exact: true }).fill(password); await p.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(p).toHaveURL(/\/account$/); }
  const png = await sharp({ create: { width: 200, height: 160, channels: 3, background: "white" } }).png().toBuffer();
  try {
    for (let i = 0; i < 2; i++) { const email = `management-browser-${crypto.randomUUID()}@example.test`; const u = await service.auth.admin.createUser({ email, password, email_confirm: true }); expect(u.error).toBeNull(); users.push({ id: u.data.user!.id, email }); }
    fixtureAdmin(users[1].id, true);
    const adminClient = createClient(c.url, c.publicKey, { auth: { persistSession: false } }); await adminClient.auth.signInWithPassword({ email: users[1].email, password });
    const p = await adminClient.rpc("create_property", { p_input: { name, address: "Synthetic browser management lane", state: "Delhi", city: "Test city", locality: "Test area", type: "Flat", min: 1000, max: 2000, synthetic: true }, p_acknowledged: true }); expect(p.error).toBeNull(); property = p.data;
    const tenant = createClient(c.url, c.publicKey, { auth: { persistSession: false } }); await tenant.auth.signInWithPassword({ email: users[0].email, password });
    const review = await tenant.rpc("create_review", { p_input: { property, start: "2024-01-01", current: true, paid: 1200, propertyRating: 4, body: "Synthetic management browser review.", synthetic: true } }); expect(review.error).toBeNull();
    await login(tenantPage, users[0].email); await tenantPage.goto(`/reviews/${review.data.id}/edit`);
    async function upload() { await tenantPage.getByLabel("Fictional supporting documents").setInputFiles({ name: "synthetic-bill.png", mimeType: "image/png", buffer: png }); await tenantPage.getByLabel("This document contains only invented").check(); await tenantPage.getByRole("button", { name: "Request demonstration verification" }).click(); await expect(tenantPage.getByText("Private demonstration verification requested.", { exact: false })).toBeVisible(); const rows = (await tenant.rpc("get_my_verifications")).data; paths.push(`verification/${rows[0].document_id}.jpg`); return rows[0]; }
    const application = await upload();
    await tenantPage.goto("/admin/verification-management"); await expect(tenantPage.getByRole("heading", { name: "Access restricted." })).toBeVisible();
    await login(page, users[1].email); await page.goto("/admin/verification-management"); await page.getByLabel("Search applications").fill(name); await page.getByRole("button", { name: "Apply filters" }).click(); await expect(page.getByRole("status")).toContainText("1 application"); await page.getByRole("link", { name: "View Details", exact: true }).click();
    await expect(page.getByText("Synthetic browser management lane", { exact: true })).toBeVisible(); await page.getByText("Open secure document preview", { exact: true }).click(); await expect(page.locator(".verification-previews img")).toHaveCount(1); await expect.poll(() => page.locator(".verification-previews img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    async function decide(action: string, reason: string) { await page.getByRole("combobox", { name: /Administrative action/ }).selectOption(action); await page.getByLabel("Decision or information request reason").fill(reason); await page.getByRole("button", { name: "Review and confirm action" }).click(); await page.getByRole("dialog").getByRole("button", { name: "Confirm action", exact: true }).click(); }
    await decide("request_information", "Please include complete pages with the property address."); await expect(page.getByRole("dialog")).toContainText("Application updated."); await page.keyboard.press("Escape"); await expect(page.getByText("Awaiting Applicant Information", { exact: true })).toBeVisible();
    await tenantPage.goto(`/reviews/${review.data.id}/edit`); await expect(tenantPage.getByText("Awaiting your information", { exact: true })).toBeVisible(); await expect(tenantPage.getByText("Upload a complete updated evidence set", { exact: false })).toBeVisible(); const updated = await upload(); expect(updated.id).toBe(application.id);
    await page.reload(); await expect(page.getByText("Under Review", { exact: true })).toBeVisible(); await decide("approved", "Synthetic complete evidence reviewed and approved."); await page.keyboard.press("Escape"); await expect(page.getByText("Demo approved", { exact: true })).toBeVisible(); await expect(page.getByText("verification evidence updated", { exact: true })).toBeVisible();
    await tenantPage.goto(`/properties/${property}`); await expect(tenantPage.getByText("Demonstration verified tenant", { exact: false })).toBeVisible();
    await page.goto("/admin/verification-management"); await page.getByLabel("Search applications").fill(name); await page.getByRole("button", { name: "Apply filters" }).click(); await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]); await page.screenshot({ path: info.outputPath("verification-management-mobile.png"), fullPage: true });
  } finally { await tenantContext.close(); if (paths.length) await service.storage.from("rental-documents").remove(paths); for (const u of users) await service.auth.admin.deleteUser(u.id); if (property) await service.from("properties").delete().eq("id", property); }
});
