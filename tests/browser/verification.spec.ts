import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { cleanupReviewUser } from "../helpers/review-cleanup";
const c = localBackendConfiguration();
if (!c) throw new Error("Isolated backend required");
test("private demonstration documents, trusted approval, recommendation threshold and revocation", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120000);
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const identities: {
    id: string;
    email: string;
    password: string;
    review?: string;
  }[] = [];
  const clients: (typeof service)[] = [];
  const documents: string[] = [];
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const anonymous = await browser.newContext();
  let property: string | undefined;
  async function login(target: typeof page, index: number) {
    await target.goto("/sign-in");
    await target.getByLabel("Email address").fill(identities[index].email);
    await target
      .getByLabel("Password", { exact: true })
      .fill(identities[index].password);
    await target.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(target).toHaveURL(/\/account$/);
  }
  try {
    for (let n = 0; n < 4; n++) {
      const email =
        "browser-verification-" + crypto.randomUUID() + "@example.test";
      const password = "Synthetic demonstration browser password";
      const u = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          public_alias: "VerificationVoice-" + crypto.randomUUID().slice(0, 6),
        },
      });
      expect(u.error).toBeNull();
      identities.push({ id: u.data.user!.id, email, password });
      const client = createClient(c.url, c.publicKey, {
        auth: { persistSession: false },
      });
      expect(
        (await client.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      clients.push(client);
    }
    const name = "Demo Verification " + crypto.randomUUID().slice(0, 8);
    const added = await clients[0].rpc("create_property", {
      p_input: {
        name,
        address: "Fictional verification lane " + crypto.randomUUID(),
        state: "Delhi",
        city: "Verification browser city",
        locality: "Fictional area",
        type: "Flat",
        min: 1000,
        max: 2000,
        synthetic: true,
      },
    });
    expect(added.error).toBeNull();
    property = added.data;
    const png = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#f2e8d4" },
    })
      .png()
      .toBuffer();
    for (let n = 0; n < 3; n++) {
      const r = await clients[n].rpc("create_review", {
        p_input: {
          property,
          start: "2025-01-01",
          current: true,
          paid: 1500,
          propertyRating: 5,
          body: "Fictional verification browser tenancy example.",
          woman: true,
          recommend: true,
          synthetic: true,
        },
      });
      expect(r.error).toBeNull();
      identities[n].review = r.data.id;
      await login(page, n);
      await page.goto("/reviews/" + r.data.id + "/edit");
      await page.getByLabel("Fictional rental document image").setInputFiles({
        name: "synthetic-document.png",
        mimeType: "image/png",
        buffer: png,
      });
      await page.getByLabel("This document contains only invented").check();
      await page
        .getByRole("button", { name: "Request demonstration verification" })
        .click();
      await expect(page.getByRole("status")).toContainText(
        "Private demonstration verification requested",
      );
      const docUrl = await page
        .getByRole("link", { name: "Download your private document" })
        .getAttribute("href");
      documents.push("verification/" + docUrl!.split("/").at(-1) + ".jpg");
      // Retry transport resets only; every HTTP response must satisfy the same checks.
      const downloaded = await page.request.get(docUrl!, { maxRetries: 2 });
      expect(downloaded.status()).toBe(200);
      expect(downloaded.headers()["cache-control"]).toContain("no-store");
      expect(downloaded.headers()["content-disposition"]).toContain(
        "attachment",
      );
      expect(
        (
          await anonymous.request.get("http://127.0.0.1:3000" + docUrl!, {
            maxRetries: 2,
          })
        ).status(),
      ).toBe(401);
      if (n === 0) {
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: info.outputPath("private-verification.png"),
          fullPage: true,
        });
      }
      await page.goto("/account");
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await expect(page).toHaveURL(/notice=signed-out/);
    }
    fixtureAdmin(identities[3].id, true);
    await login(adminPage, 3);
    await adminPage.goto("/admin/verification");
    for (let n = 0; n < 3; n++) {
      const card = adminPage.locator("section.dashboard-card").filter({
        has: adminPage.getByRole("heading", {
          name:
            name +
            " · " +
            (await clients[n].rpc("get_my_account")).data[0].public_alias,
          exact: true,
        }),
      });
      await card
        .getByLabel("Decision reason")
        .fill("Fictional demonstration document checked for testing.");
      await card
        .getByRole("button", { name: "Save verification decision" })
        .click();
      await expect(card).toContainText("approved");
      await page.goto("/properties/" + property);
      await expect(page.getByRole("main")).toContainText(n + 1 + "/" + (n + 1));
    }
    await page.goto("/properties/" + property);
    await expect(page.getByRole("main")).toContainText(
      "Recommended by eligible women tenants.",
    );
    await expect(
      page.getByText("Demonstration verified tenant · synthetic example", {
        exact: false,
      }),
    ).toHaveCount(3);
    await expect(page.getByRole("main")).not.toContainText("verification/");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath("recommended-profile.png"),
      fullPage: true,
    });
    await page.goto(
      "/search?q=" + encodeURIComponent(name) + "&women=recommended",
    );
    await expect(page.locator(".property-card")).toHaveCount(1);
    const firstCard = adminPage.locator("section.dashboard-card").filter({
      has: adminPage.getByRole("heading", {
        name:
          name +
          " · " +
          (await clients[0].rpc("get_my_account")).data[0].public_alias,
        exact: true,
      }),
    });
    await firstCard
      .getByLabel("Decision reason")
      .fill("Fictional verification revoked to test recalculation.");
    await firstCard
      .getByRole("button", { name: "Save verification decision" })
      .click();
    await expect(firstCard).toContainText("revoked");
    await page.reload();
    await expect(page.locator(".property-card")).toHaveCount(0);
    await adminPage.screenshot({
      path: info.outputPath("admin-verification.png"),
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page: adminPage })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    fixtureAdmin(identities[3].id, false);
    expect(
      (
        await adminPage.request.get(
          "/api/documents/" +
            documents[0].split("/").at(-1)!.replace(".jpg", ""),
        )
      ).status(),
    ).toBe(404);
    await adminPage.goto("/admin/verification");
    await expect(
      adminPage.getByRole("heading", { name: "Access restricted." }),
    ).toBeVisible();
  } finally {
    try {
      await adminContext.close();
      await anonymous.close();
    } finally {
      // Fixture cleanup must also run if browser trace/context shutdown fails.
      if (documents.length)
        await service.storage.from("rental-documents").remove(documents);
      for (const u of identities) {
        cleanupReviewUser(u.id);
        expect((await service.auth.admin.deleteUser(u.id)).error).toBeNull();
      }
      if (property)
        expect(
          (await service.from("properties").delete().eq("id", property)).error,
        ).toBeNull();
    }
  }
});
