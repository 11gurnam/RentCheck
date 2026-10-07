import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";

test("signed-out desktop navigation hides account actions and uses neutral close focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/register");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Explore", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  for (const label of ["Shortlist", "Your reviews", "Your claims", "Add a place", "Your account"])
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveCount(0);
  await page.getByLabel("Email address").focus();
  await expect(page.getByLabel("Email address")).toHaveCSS("outline-color", "rgb(89, 104, 121)");
  await expect(page.getByLabel("Email address")).toHaveCSS("outline-offset", "-1px");
});

test("mobile menus open, close with Escape, and fit narrow screens", async ({ page }, testInfo) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/register", "/sign-in", "/search"]) {
      await page.goto(path);
      const toggle = page.getByRole("button", { name: "Menu", exact: true });
      const nav = page.getByRole("navigation", { name: "Main navigation", includeHidden: true });
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveText("");
      await expect(nav).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (path === "/register" && width === 390)
        await page.screenshot({ path: testInfo.outputPath("mobile-menu.png"), fullPage: true });
      await page.keyboard.press("Escape");
      await expect(nav).toBeHidden();
      await expect(toggle).toBeFocused();
      await toggle.click();
      await page.mouse.click(5, 100);
      await expect(nav).toBeHidden();
    }
  }
});

test("signed-in users see account actions on desktop and mobile", async ({ page }, testInfo) => {
  const backend = localBackendConfiguration();
  test.skip(!backend, "Requires the isolated local backend.");
  const admin = createClient(backend!.url, backend!.serviceKey, { auth: { persistSession: false } });
  const email = `navigation-${crypto.randomUUID()}@example.test`;
  const password = "Synthetic navigation passphrase 2026";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { public_alias: "NavigationTenant" },
  });
  expect(error).toBeNull();
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    for (const path of ["/account", "/"]) {
      await page.goto(path);
      for (const label of ["Shortlist", "Your reviews", "Your claims", "Add a place", "Your account"])
        await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Your reviews", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("signed-in-mobile-menu.png"), fullPage: true });
  } finally {
    if (data.user) await admin.auth.admin.deleteUser(data.user.id);
  }
});

test("mouse-wheel scrolling reaches the footer in mobile emulation", async ({ browser }) => {
  for (const isMobile of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 740 }, isMobile, hasTouch: isMobile });
    const page = await context.newPage();
    try {
      for (const path of ["/", "/register", "/search"]) {
        await page.goto(path);
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page.mouse.move(195, 600);
        await page.mouse.wheel(0, 10000);
        await expect(page.getByRole("contentinfo")).toBeInViewport();
        await expect.poll(() => page.getByRole("contentinfo").evaluate(footer => footer.getBoundingClientRect().bottom <= innerHeight + 1)).toBe(true);
        await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute("aria-expanded", "false");
      }
    } finally {
      await context.close();
    }
  }
});

test("search actions align with filters and navigation highlights the current page", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/search");
  const explore = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Explore", exact: true });
  await expect(explore).toHaveAttribute("aria-current", "page");
  await expect(explore.locator("svg")).toHaveCount(1);
  const apply = page.getByRole("button", { name: "Apply filters", exact: true });
  const rating = page.getByLabel("Minimum property rating");
  const buttonBounds = await apply.boundingBox();
  const inputBounds = await rating.boundingBox();
  expect(Math.abs(buttonBounds!.y + buttonBounds!.height - inputBounds!.y - inputBounds!.height)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("desktop-search.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 740 });
  const reset = page.locator(".filter-actions a");
  const mobileApply = await apply.boundingBox();
  const mobileReset = await reset.boundingBox();
  expect(mobileApply!.y).toBe(mobileReset!.y);
  expect(mobileApply!.height).toBe(mobileReset!.height);
});
