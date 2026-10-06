import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { cleanupReviewUser } from "../helpers/review-cleanup";
const c = localBackendConfiguration();
if (!c) throw new Error("Local backend required");
test("claim upload, trusted approval, details, separate reply and revocation", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120000);
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const users: { id: string; email: string; password: string }[] = [];
  const clients: (typeof service)[] = [];
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  let property: string | undefined, evidenceDoc: string | undefined;
  async function login(p: typeof page, n: number) {
    await p.goto("/sign-in");
    await p.getByLabel("Email address").fill(users[n].email);
    await p.getByLabel("Password", { exact: true }).fill(users[n].password);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(p).toHaveURL(/\/account$/);
  }
  try {
    for (let n = 0; n < 3; n++) {
      const email = "claim-browser-" + crypto.randomUUID() + "@example.test",
        password = "Synthetic claim browser password";
      const u = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          public_alias: "ClaimVoice-" + crypto.randomUUID().slice(0, 6),
        },
      });
      expect(u.error).toBeNull();
      users.push({ id: u.data.user!.id, email, password });
      const client = createClient(c.url, c.publicKey, {
        auth: { persistSession: false },
      });
      await client.auth.signInWithPassword({ email, password });
      clients.push(client);
    }
    const name = "Fictional Claim " + crypto.randomUUID().slice(0, 8);
    const added = await clients[1].rpc("create_property", {
      p_input: {
        name,
        address: "Invented claim lane " + crypto.randomUUID(),
        state: "Delhi",
        city: "Claim test city",
        locality: "Fictional locality",
        type: "Flat",
        min: 1000,
        max: 2000,
        synthetic: true,
      },
    });
    expect(added.error).toBeNull();
    property = added.data;
    const r = await clients[1].rpc("create_review", {
      p_input: {
        property,
        start: "2025-01-01",
        current: true,
        paid: 1500,
        propertyRating: 4,
        body: "Fictional tenant experience preserved during representative reply.",
        synthetic: true,
      },
    });
    expect(r.error).toBeNull();
    await login(page, 0);
    await page.goto("/claims/new?kind=property&target=" + property);
    await page.getByLabel("Fictional claim evidence image").setInputFiles({
      name: "fictional.png",
      mimeType: "image/png",
      buffer: await sharp({
        create: { width: 400, height: 300, channels: 3, background: "white" },
      })
        .png()
        .toBuffer(),
    });
    await page.getByLabel("This claim and evidence use only").check();
    await page
      .getByRole("button", { name: "Submit demonstration claim" })
      .click();
    await expect(page.getByRole("status")).toContainText("claim submitted");
    await page.goto("/claims");
    await expect(page.locator("main")).toContainText("pending");
    await expect(
      page.getByRole("button", { name: "Save claimed details" }),
    ).toHaveCount(0);
    const url = await page
      .getByRole("link", { name: /Download/ })
      .getAttribute("href");
    evidenceDoc = url!.split("/").at(-1);
    expect((await page.request.get(url!)).status()).toBe(200);
    fixtureAdmin(users[2].id, true);
    await login(admin, 2);
    await admin.goto("/admin/claims");
    const card = admin
      .locator("section.dashboard-card")
      .filter({ has: admin.locator('a[href="' + url + '"]') });
    await card
      .getByLabel("Claim decision reason")
      .fill("Fictional claim checked by test administrator.");
    await card.getByRole("button", { name: "Save claim decision" }).click();
    await expect(card).toContainText("approved");
    await page.goto("/claims");
    await page.getByLabel("Profile name").fill(name + " Updated");
    await page
      .getByLabel("Change reason")
      .fill("Correcting this fictional demonstration name.");
    await page.getByRole("button", { name: "Save claimed details" }).click();
    await expect(page.getByRole("status")).toContainText("updated and audited");
    await page.goto("/properties/" + property);
    await expect(
      page.getByRole("heading", { name: name + " Updated", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Your public representative reply")
      .fill("Fictional representative response recorded separately.");
    await page
      .getByRole("button", { name: "Save representative reply" })
      .click();
    await expect(page.locator("main")).toContainText(
      "Fictional representative response recorded separately.",
    );
    await expect(page.locator("main")).toContainText(
      "Fictional tenant experience preserved during representative reply.",
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("claim-reply.png"),
      fullPage: true,
    });
    await card
      .getByLabel("Claim decision reason")
      .fill("Revoking the fictional demonstration representative.");
    await card.getByRole("button", { name: "Save claim decision" }).click();
    await expect(card).toContainText("revoked");
    await page.reload();
    await expect(page.locator("main")).not.toContainText(
      "Fictional representative response recorded separately.",
    );
    await expect(
      page.getByRole("button", { name: "Save representative reply" }),
    ).toHaveCount(0);
  } finally {
    await adminContext.close();
    if (evidenceDoc)
      await service.storage
        .from("rental-documents")
        .remove(["claim/" + evidenceDoc + ".jpg"]);
    for (const u of users) {
      cleanupReviewUser(u.id);
      expect((await service.auth.admin.deleteUser(u.id)).error).toBeNull();
    }
    if (property)
      expect(
        (await service.from("properties").delete().eq("id", property)).error,
      ).toBeNull();
  }
});
