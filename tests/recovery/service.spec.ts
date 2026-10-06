import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { disruptReviewFeed } from "../helpers/service-disruption";
test("database failure shows a private-safe retry screen and recovers", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  try {
    disruptReviewFeed(true);
    await page.goto("/properties/20000000-0000-4000-8000-000000000001");
    await expect(
      page.getByRole("heading", { name: "We couldn’t load this page." }),
    ).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("permission denied");
    await expect(page.getByRole("main")).not.toContainText("get_review_page");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath("recovery-error.png"),
      fullPage: true,
    });
    disruptReviewFeed(false);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(
      page.getByRole("heading", { name: "Demo Neem Courtyard", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await page.getByRole("link", { name: "Skip to content" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  } finally {
    disruptReviewFeed(false);
  }
});
