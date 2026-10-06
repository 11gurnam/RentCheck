import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("search combines URL filters and reset restores all examples", async ({
  page,
}) => {
  await page.goto("/search");
  await expect(page.locator(".property-card")).toHaveCount(8);
  await page.getByLabel("City", { exact: true }).selectOption("Mumbai");
  await page.getByLabel("Accommodation type").selectOption("PG");
  await page.getByLabel("Maximum rent").fill("12000");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/city=Mumbai/);
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(page.locator(".property-card")).toContainText("Demo Sea Breeze");
  await page.reload();
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Mumbai");
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await expect(page.locator(".property-card")).toHaveCount(8);
});
test("empty, invalid filters, literal wildcard and qualified locality", async ({
  page,
}) => {
  await page.goto("/search?q=nothingmatches");
  await expect(
    page.getByRole("heading", { name: "No matching places" }),
  ).toBeVisible();
  await page.goto("/search?min=200&max=100");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Maximum rent",
  );
  await page.goto("/search?city=Jaipur&locality=Central+Park");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(page.locator(".property-card")).toContainText("Rose Studio");
  await page.goto("/search?q=%25");
  await expect(page.locator(".property-card")).toHaveCount(0);
});
test("profiles preserve dated historic associations and unknown profiles return 404", async ({
  page,
}, info) => {
  await page.goto("/search?q=Demo+Previous");
  await page.getByRole("link", { name: "Demo Neem Courtyard" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Demo Neem Courtyard",
  );
  await expect(
    page.getByRole("heading", { name: "Management history" }),
  ).toBeVisible();
  await expect(page.locator(".history-panel")).toContainText("2025-01-01");
  await page.screenshot({
    path: info.outputPath("property.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Demo Previous Management" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Demo Previous Management",
  );
  await expect(page.locator(".history-panel")).toContainText("Demo Neem");
  await page.screenshot({
    path: info.outputPath("landlord.png"),
    fullPage: true,
  });
  expect((await page.goto("/properties/not-a-uuid"))?.status()).toBe(404);
});
test("discovery screens have no overflow or detected accessibility violations", async ({
  page,
}, info) => {
  for (const path of [
    "/search",
    "/properties/20000000-0000-4000-8000-000000000001",
    "/landlords/10000000-0000-4000-8000-000000000001",
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath(
        path === "/search"
          ? "search.png"
          : path.includes("properties")
            ? "property.png"
            : "landlord.png",
      ),
      fullPage: true,
    });
    if (path === "/search") {
      await page.screenshot({path:info.outputPath("search-top.png")});
      await page.locator(".property-card").first().scrollIntoViewIfNeeded();
      await page.screenshot({path:info.outputPath("search-cards.png")});
    }
  }
});
