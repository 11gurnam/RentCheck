import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
import { cleanupReviewUser } from "../helpers/review-cleanup";
const c = localBackendConfiguration();
if (!c) throw new Error("Local backend required");
test("author creates, edits, uploads and deletes a review without exposing private answers", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const admin = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const email = "browser-review-" + crypto.randomUUID() + "@example.test";
  const password = "Synthetic review browser password";
  const u = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(u.error).toBeNull();
  const paths: string[] = [];
  try {
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/properties/20000000-0000-4000-8000-000000000001");
    await page.getByRole("link", { name: "Write a review" }).click();
    await page.getByLabel("Tenancy start").fill("2024-01-01");
    await page.getByLabel("Tenancy status").selectOption("false");
    await page.getByLabel("Tenancy end").fill("2024-12-01");
    await page.getByLabel("Monthly rent paid (INR)").fill("15000");
    await page
      .getByRole("combobox", { name: "Property rating", exact: true })
      .selectOption("4");
    await page
      .getByRole("combobox", { name: "Management rating", exact: true })
      .selectOption("2");
    await page
      .getByLabel("Your experience")
      .fill(
        "A fictional stay with a pleasant courtyard and slow management responses.",
      );
    await page.getByLabel("I explicitly self-identify").check();
    await page.getByLabel("Would you recommend").selectOption("true");
    await page.getByLabel("This is a fictional").check();
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
    await page.screenshot({ path: info.outputPath("review-top.png") });
    await page.screenshot({
      path: info.outputPath("review-form.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Publish review" }).click();
    await expect(page).toHaveURL(/\/account\/reviews$/);
    await page.getByRole("link", { name: "Edit review and photos" }).click();
    await expect(page.getByLabel("Tenancy start")).toHaveAttribute(
      "readonly",
      "",
    );
    await page
      .getByLabel("Your experience")
      .fill(
        "Updated fictional experience: the courtyard was pleasant throughout our tenancy.",
      );
    await page.getByLabel("This is a fictional").check();
    await page
      .getByRole("button", { name: "Save review", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/reviews$/);
    await page.getByRole("link", { name: "Edit review and photos" }).click();
    await page.getByLabel("Photo", { exact: true }).setInputFiles({
      name: "fake.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("<html>not a photo</html>"),
    });
    await page.getByRole("button", { name: "Add photo" }).click();
    await expect(page.getByRole("status")).toContainText("Photo rejected");
    const png = await sharp({
      create: { width: 600, height: 400, channels: 3, background: "#2a705b" },
    })
      .png()
      .toBuffer();
    await page.getByLabel("Photo", { exact: true }).setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: png,
    });
    await page.getByRole("button", { name: "Add photo" }).click();
    await expect(page.getByRole("status")).toContainText("Photo added");
    const url = await page
      .getByRole("link", { name: "View photo" })
      .getAttribute("href");
    expect(url).toBeTruthy();
    const photo = await page.request.get(url!);
    expect(photo.status()).toBe(200);
    expect(photo.headers()["content-type"]).toBe("image/jpeg");
    const path = await admin.rpc("get_photo_path", {
      p_photo: url!.split("/").at(-1),
    });
    paths.push(path.data);
    await page.goto("/properties/20000000-0000-4000-8000-000000000001");
    await expect(
      page.getByText("Updated fictional experience:", { exact: false }),
    ).toBeVisible();
    await expect(page.locator('img[src="' + url + '"]')).toBeVisible();
    await expect(page.locator("main")).not.toContainText(email);
    await expect(page.locator("main")).not.toContainText("self-identify");
    await page.screenshot({
      path: info.outputPath("review-profile.png"),
      fullPage: true,
    });
    await page.goto("/account/reviews");
    await page.getByLabel("Confirm deleting").check();
    await page.getByRole("button", { name: "Delete review" }).click();
    await expect(page.locator("main")).toContainText("deleted · 2024-01-01");
    expect((await page.request.get(url!)).status()).toBe(404);
  } finally {
    if (paths.length) await admin.storage.from("review-photos").remove(paths);
    cleanupReviewUser(u.data.user!.id);
    expect(
      (await admin.auth.admin.deleteUser(u.data.user!.id)).error,
    ).toBeNull();
  }
});
