import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public introduction loads without backend configuration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/RentCheck/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "before you move",
  );
  await expect(
    page.getByText("Search and accounts are coming", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("never a platform safety guarantee", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("navigation and keyboard skip link lead to real content", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await page.getByRole("link", { name: "Get to know RentCheck" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(
    page.getByRole("heading", {
      name: "Know a little more. Choose a little better.",
    }),
  ).toBeInViewport();
  await page.getByRole("link", { name: "Our principles" }).click();
  await expect(page).toHaveURL(/#our-principles$/);
  await page.getByRole("link", { name: "RentCheck home" }).first().click();
  await expect(page).toHaveURL(/#top$/);
});

test("introduction has no detected WCAG A/AA violations and captures visual evidence", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("introduction.png"),
    fullPage: true,
  });
});

test("unknown routes return a helpful 404", async ({ page }) => {
  const response = await page.goto("/unknown-property");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
