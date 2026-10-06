import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { cleanupReviewUser } from "../helpers/review-cleanup";
const c = localBackendConfiguration();
if (!c) throw new Error("Local backend required");
test("older experiences, escaped tenant text, admin boundaries and filtered manager audit", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const email = "release-browser-" + crypto.randomUUID() + "@example.test",
    password = "Synthetic release browser password";
  const u = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(u.error).toBeNull();
  const user = u.data.user!.id,
    client = createClient(c.url, c.publicKey, {
      auth: { persistSession: false },
    });
  await client.auth.signInWithPassword({ email, password });
  let property: string | undefined, manager: string | undefined;
  let dialogs = 0;
  page.on("dialog", async (d) => {
    dialogs++;
    await d.dismiss();
  });
  try {
    const added = await client.rpc("create_property", {
      p_input: {
        name: "Fictional release " + crypto.randomUUID().slice(0, 8),
        address: "Invented release lane " + crypto.randomUUID(),
        state: "Delhi",
        city: "Release browser city",
        locality: "Fictional area",
        type: "Flat",
        min: 1000,
        max: 2000,
        synthetic: true,
      },
      p_acknowledged: true,
    });
    expect(added.error).toBeNull();
    property = added.data;
    for (let n = 0; n < 21; n++)
      expect(
        (
          await client.rpc("create_review", {
            p_input: {
              property,
              start: 1991 + n + "-01-01",
              end: 1991 + n + "-02-01",
              current: false,
              paid: 1500,
              propertyRating: 4,
              body:
                "Fictional paginated experience " +
                n +
                (n === 0 ? ' <img src=x onerror="alert(1)">' : ""),
              synthetic: true,
            },
          })
        ).error,
      ).toBeNull();
    await page.goto("/properties/" + property);
    await expect(
      page.locator("#experiences>article.dashboard-card"),
    ).toHaveCount(20);
    await expect(page.locator("#experiences")).toContainText(
      "21 experiences · Page 1",
    );
    await page.getByRole("link", { name: "Next experiences page" }).click();
    await expect(page).toHaveURL(/reviews=2#experiences$/);
    await expect(
      page.locator("#experiences>article.dashboard-card"),
    ).toHaveCount(1);
    await expect(page.locator("#experiences")).toContainText(
      '<img src=x onerror="alert(1)">',
    );
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    expect(dialogs).toBe(0);
    await expect(page.getByRole("main")).not.toContainText(email);
    await expect(page.getByRole("main")).not.toContainText(user);
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
      path: info.outputPath("older-experience.png"),
      fullPage: true,
    });
    await page.goto("/properties/" + property + "?reviews=9999");
    await expect(
      page.getByRole("link", { name: "Return to the first experiences page" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Return to the first experiences page" })
      .click();
    await expect(
      page.locator("#experiences>article.dashboard-card"),
    ).toHaveCount(20);
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    for (const route of [
      "claims",
      "reports",
      "duplicates",
      "merge",
      "associations",
      "audit",
    ]) {
      await page.goto("/admin/" + route);
      await expect(
        page.getByRole("heading", { name: "Access restricted." }),
      ).toBeVisible();
    }
    fixtureAdmin(user, true);
    await page.goto("/admin/associations");
    const name = "Fictional release manager " + crypto.randomUUID().slice(0, 8);
    const form = page.locator("section.dashboard-card").filter({
      has: page.getByRole("heading", {
        name: "Add a fictional manager",
        exact: true,
      }),
    });
    await form.getByLabel("Fictional manager name").fill(name);
    await form
      .getByLabel("Manager description")
      .fill("Entirely invented manager profile for the release walkthrough.");
    await form
      .getByLabel("Manager creation reason")
      .fill("Fictional manager added to check audited administration.");
    await form
      .getByLabel("This manager information is entirely invented")
      .check();
    await form
      .getByRole("button", { name: "Create fictional manager" })
      .click();
    await expect(form.getByRole("status")).toContainText("created and audited");
    manager = (
      await service.from("landlords").select("id").eq("name", name).single()
    ).data!.id;
    await page.goto("/admin/audit");
    await page.getByLabel("Record ID filter").fill(manager!);
    await page
      .getByRole("combobox", { name: "Action filter" })
      .selectOption("manager_created");
    await page.getByRole("button", { name: "Filter audit records" }).click();
    await expect(page.getByRole("main")).toContainText("1 matching records");
    await page
      .getByText("Inspect previous and new values", { exact: true })
      .click();
    await expect(page.getByRole("main")).toContainText(name);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath("filtered-audit.png"),
      fullPage: true,
    });
    fixtureAdmin(user, false);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Access restricted." }),
    ).toBeVisible();
    const missing = await page.goto("/properties/not-a-profile");
    expect(missing?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "That page isn’t available." }),
    ).toBeVisible();
  } finally {
    if (manager) await service.from("landlords").delete().eq("id", manager);
    cleanupReviewUser(user);
    expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
    if (property)
      expect(
        (await service.from("properties").delete().eq("id", property)).error,
      ).toBeNull();
  }
});
