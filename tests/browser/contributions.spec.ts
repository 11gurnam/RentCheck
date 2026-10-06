import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import { localBackendConfiguration } from "../helpers/local-backend";
const config = localBackendConfiguration();
if (!config) throw new Error("Local test backend required");
test("anonymous contributions and shortlist redirect to sign in", async ({
  page,
}) => {
  for (const path of ["/saved", "/properties/new"]) {
    await page.goto(path);
    await expect(page).toHaveURL(
      new RegExp(`/sign-in\\?next=${encodeURIComponent(path)}$`),
    );
  }
});
test("shortlists persist privately and property contribution checks duplicates", async ({
  page,
}, info) => {
  const admin = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false },
  });
  const email = `browser-contribution-${crypto.randomUUID()}@example.test`;
  const password = "Synthetic contribution browser passphrase";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  let property: string | undefined;
  try {
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/properties/20000000-0000-4000-8000-000000000001");
    await page.getByRole("button", { name: "Save to shortlist" }).click();
    await expect(
      page.getByRole("button", { name: "Remove from shortlist" }),
    ).toBeVisible();
    await page.goto("/saved");
    await expect(
      page.getByRole("link", { name: "Demo Neem Courtyard" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Demo Neem Courtyard" }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("shortlist.png"),
      fullPage: true,
    });
    await page.goto("/properties/new");
    for (const [label, value] of [
      ["Property name", "Demo Neem Courtyard"],
      ["Full demo address", "Demo Lane 12, Central Park"],
      ["State / union territory", "Delhi"],
      ["City", "New Delhi"],
      ["Locality", "Central Park"],
      ["Minimum monthly rent (₹)", "10000"],
      ["Maximum monthly rent (₹)", "20000"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page
      .getByLabel("All details are fictional demonstration data.")
      .check();
    await page.getByRole("button", { name: "Add demo property" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "already has a profile",
    );
    await expect(
      page.getByRole("link", { name: "Demo Neem Courtyard" }),
    ).toBeVisible();
    await expect(page.getByLabel("Property name")).toHaveValue(
      "Demo Neem Courtyard",
    );
    await expect(page.getByLabel("All details are fictional demonstration data.")).toBeChecked();
    await page.screenshot({
      path: info.outputPath("duplicates.png"),
      fullPage: true,
    });
    const name = `Browser Fixture ${crypto.randomUUID().slice(0, 8)}`;
    await page.getByLabel("Property name").fill(name);
    await page.getByLabel("City", { exact: true }).fill("Browser Fixture City");
    await page
      .getByLabel("Full demo address")
      .fill(`Fictional Lane ${crypto.randomUUID()}`);
    await page
      .getByLabel("All details are fictional demonstration data.")
      .check();
    await page.getByRole("button", { name: "Add demo property" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    property = page.url().split("/").at(-1);
    await page.goto("/saved");
    await page.getByRole("button", { name: "Remove from shortlist" }).click();
    await expect(page.getByText("No places saved yet.")).toBeVisible();
    await page.goto("/properties/new");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("add-property.png"),
      fullPage: true,
    });
  } finally {
    if (property) await admin.from("properties").delete().eq("id", property);
    await admin.auth.admin.deleteUser(data.user!.id);
  }
});
