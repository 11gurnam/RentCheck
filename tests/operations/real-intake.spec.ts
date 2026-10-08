import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
import AxeBuilder from "@axe-core/playwright";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { localBackendConfiguration } from "../helpers/local-backend";
const c = localBackendConfiguration();
if (!c) throw new Error("Only the local backend is supported");
test("real intake retains demo labels, requires review checklist and physically expires evidence", async ({ page, request }, info) => {
  test.setTimeout(100000);
  const service = createClient(c!.url, c!.serviceKey, { auth: { persistSession: false } });
  const original = await createClient(c!.url, c!.publicKey).rpc("get_operation_mode"); expect(original.error).toBeNull();
  const users: string[] = [], emails: string[] = [], clients: (typeof service)[] = []; let property: string | undefined;
  const password = "Synthetic operations browser passphrase";
  try {
    expect((await service.rpc("configure_operation_mode", { p_real: true, p_days: 7, p_reason: "Synthetic serial browser intake check" })).error).toBeNull();
    for (let i = 0; i < 2; i++) {
      const email = `operation-browser-${crypto.randomUUID()}@example.test`, u = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { public_alias: i ? "OperationTenant" : "OperationAdministrator" } });
      expect(u.error).toBeNull(); users.push(u.data.user!.id); emails.push(email);
      const client = createClient(c!.url, c!.publicKey, { auth: { persistSession: false } }); expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull(); clients.push(client);
    }
    fixtureAdmin(users[0], true);
    expect((await request.get("/api/admin/health")).status()).toBe(401);
    const live = await request.get("/api/health"); expect(live.status()).toBe(200); expect(await live.json()).toEqual({ status: "ok" });
    for (const [index, email] of emails.entries()) {
      await page.goto("/sign-in"); await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill(password); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/account$/);
      if (index === 0) {
        const result = await clients[0].rpc("create_property", { p_input: { name: "Synthetic real intake " + crypto.randomUUID().slice(0, 8), address: "Synthetic real-mode lane " + crypto.randomUUID(), state: "Delhi", city: "Operation browser city", locality: "Fixture area", type: "Flat", min: 1000, max: 2000, synthetic: false, consent: true }, p_acknowledged: true }); expect(result.error).toBeNull(); property = result.data;
        await page.goto("/properties/new"); await expect(page.getByText("Contribute accurate property details.", { exact: false })).toBeVisible();
        await page.goto("/account"); await page.getByRole("button", { name: "Sign out", exact: true }).click(); await expect(page).toHaveURL(/notice=signed-out/);
      }
    }
    expect((await page.request.get("/api/admin/health")).status()).toBe(403);
    await page.goto(`/reviews/new?property=${property}`); await page.getByLabel("Tenancy start").fill("2025-01-01"); await page.getByLabel("Monthly rent paid").fill("1000"); await page.getByLabel("Property rating").selectOption("4"); await page.getByLabel("Your experience").fill("Synthetic browser review exercising the real-data workflow."); await page.getByLabel("This is my own tenancy experience").check(); await page.getByRole("button", { name: "Publish review" }).click(); await expect(page).toHaveURL(/\/account\/reviews$/);
    const own = await clients[1].rpc("get_my_reviews"); expect(own.error).toBeNull(); const review = own.data[0]; expect(review.is_demo).toBe(false);
    await page.goto(`/reviews/${review.id}/edit`); const pdf = await PDFDocument.create(); pdf.addPage();
    await page.getByLabel("Redacted rental document image or PDF").setInputFiles({ name: "synthetic-evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from(await pdf.save()) }); await page.getByLabel("I have permission to submit this redacted document").check(); await page.getByRole("button", { name: "Request manual evidence review" }).click(); await expect(page.getByText("Private evidence submitted for manual tenancy review.", { exact: false })).toBeVisible();
    const verifications = await clients[1].rpc("get_my_verifications"); expect(verifications.error).toBeNull(); const verification = verifications.data[0];
    await page.goto("/account"); await page.getByRole("button", { name: "Sign out", exact: true }).click(); await expect(page).toHaveURL(/notice=signed-out/);
    await page.getByLabel("Email address").fill(emails[0]); await page.getByLabel("Password", { exact: true }).fill(password); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/account$/);
    await page.goto("/admin/verification"); const card = page.locator("section.dashboard-card").filter({ hasText: "OperationTenant" }); await card.getByLabel("Decision reason", { exact: true }).fill("Synthetic manual evidence approval"); await card.getByRole("button", { name: "Save verification decision" }).click(); await expect(card.getByRole("status")).toContainText("complete all three checklist items");
    for (const label of ["Evidence matches the applicant", "Evidence matches this property", "Tenancy period or representative authority"]) await card.getByLabel(label).check();
    await card.getByRole("button", { name: "Save verification decision" }).click(); await expect(card.getByRole("status")).toContainText("decision saved");
    await page.goto(`/properties/${property}`); await expect(page.getByText("Verified tenant · evidence manually reviewed", { exact: false })).toBeVisible(); await expect(page.getByText("synthetic example", { exact: false })).toHaveCount(0);
    await page.goto("/properties/20000000-0000-4000-8000-000000000001"); await expect(page.getByText("Synthetic example · not a rental offer", { exact: true })).toBeVisible();
    expect(/^[a-f0-9-]{36}$/.test(verification.document_id)).toBe(true);
    execFileSync("docker", ["exec", "supabase_db_rentcheck-accounts-test", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `update private.documents set expires_at=now()-interval '1 second' where id='${verification.document_id}' and owner_id='${users[1]}' and exists(select 1 from auth.users where id='${users[1]}' and email like 'operation-browser-%@example.test');`], { stdio: "pipe" });
    expect((await page.request.get(`/api/documents/${verification.document_id}`)).status()).toBe(404);
    await page.goto("/admin/operations"); await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Run media cleanup" }).click(); await expect(page.getByRole("status")).toContainText("Cleanup completed");
    const objects = await service.storage.from("rental-documents").list("verification", { search: verification.document_id }); expect(objects.error).toBeNull(); expect(objects.data).toHaveLength(0);
    const health = await page.request.get("/api/admin/health"); expect(health.status()).toBe(200); expect((await health.json()).pending_media_purges).toBe(0);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: info.outputPath("operation-status.png"), fullPage: true });
  } finally {
    expect((await service.rpc("configure_operation_mode", { p_real: original.data.accepts_real_data, p_days: original.data.evidence_retention_days, p_reason: "Restoring intake after serial browser fixture" })).error).toBeNull();
    for (const user of users) expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    if (property) await service.from("properties").delete().eq("id", property);
  }
});
