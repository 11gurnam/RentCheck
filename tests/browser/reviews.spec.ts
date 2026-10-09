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
    await page.goto("/landlords/10000000-0000-4000-8000-000000000004");
    await page
      .getByRole("link", { name: "Review this landlord", exact: true })
      .click();
    await page
      .getByRole("link", {
        name: "Review your tenancy at Demo Neem Courtyard",
        exact: true,
      })
      .click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(
      /\/reviews\/new\?property=20000000-0000-4000-8000-000000000001$/,
    );
    await page.getByLabel("Tenancy start").fill("2024-01-01");
    await page.getByLabel("Tenancy status").selectOption("false");
    await page.getByLabel("Tenancy end").fill("2024-12-01");
    await page.getByLabel("Monthly rent paid (INR)").fill("15000");
    for (const field of await page.locator('.criteria-form [role="radiogroup"]').all()) await field.getByRole("radio", { name: "4 out of 5", exact: true }).check();
    await page.getByRole("button", { name: "Add your own criterion" }).click();
    await page.getByLabel("Custom criterion name").fill("Parking");
    await page.getByRole("radiogroup", { name: "Parking rating", exact: true }).getByRole("radio", { name: "2.5 out of 5", exact: true }).check();
    await expect(page.locator(".criteria-footer output")).toContainText("3.8 / 5");
    await page
      .getByRole("combobox", {
        name: "Landlord / management rating",
        exact: true,
      })
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
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByLabel("Search reviews").fill("no matching fictional property");
    await expect(page.getByText("No matching reviews", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator(".own-review-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Stay to", exact: true }).click();
    const calendar = page.getByRole("dialog", { name: "Choose stay to date" });
    await calendar.getByLabel("Year", { exact: true }).selectOption("2000");
    await calendar.getByLabel("Month", { exact: true }).selectOption("1");
    await page.screenshot({ path: info.outputPath("review-calendar.png") });
    await calendar.getByRole("button", { name: "1 Jan 2000", exact: true }).click();
    await expect(page.locator(".own-review-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator(".review-dates")).toContainText(/\d{2} [A-Za-z]{3} \d{4}/);
    await page.getByRole("button", { name: "Delete review", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.locator(".own-review-card")).toHaveCount(1);
    await page.screenshot({ path: info.outputPath("your-reviews.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Photos", exact: true }).click();
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
    await page.getByRole("link", { name: "Edit review" }).click();
    await page.getByLabel("Photo", { exact: true }).setInputFiles({
      name: "fake.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("<html>not a photo</html>"),
    });
    await page.getByRole("button", { name: "Add photo" }).click();
    await expect(page.locator("#review-photos").getByRole("alert")).toContainText("Photo rejected");
    const png = await sharp({
      create: { width: 600, height: 400, channels: 3, background: "#2a705b" },
    })
      .png()
      .toBuffer();
    await page.goto("/properties/20000000-0000-4000-8000-000000000001");
    await page.getByRole("button", { name: "Save to shortlist", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove from shortlist", exact: true })).toBeVisible();
    await page.goto("/saved");
    await page.getByRole("button", { name: "Add photos", exact: true }).click();
    const upload = page.getByRole("dialog", { name: "Add photos", exact: true });
    await expect(upload).toBeVisible();
    await expect(page).toHaveURL(/\/saved$/);
    await upload.getByLabel("Photo", { exact: true }).setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: png,
    });
    await upload.getByRole("button", { name: "Upload photo", exact: true }).click();
    await expect(upload.getByRole("status")).toContainText("Photo added");
    await expect(page).toHaveURL(/\/saved$/);
    await page.screenshot({ path: info.outputPath("card-photo-upload.png") });
    await upload.getByRole("button", { name: "Done", exact: true }).click();
    await page.goto("/account/reviews");
    await page.getByRole("link", { name: "Photos", exact: true }).click();
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
    await expect(page.getByRole("region", { name: "Average tenant ratings" })).toContainText("Water supply");
    await expect(page.getByRole("region", { name: "Average tenant ratings" })).toContainText("Parking");
    await page.locator(".review-criterion-details").filter({ hasText: "3.8 / 5" }).getByText("Criterion ratings", { exact: false }).click();
    await expect(page.locator(".review-criteria-scores").filter({ hasText: "Parking" })).toBeVisible();
    await expect(page.locator('img[src="' + url + '"]')).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText(email);
    await expect(page.getByRole("main")).not.toContainText("self-identify");
    await page.screenshot({
      path: info.outputPath("review-profile.png"),
      fullPage: true,
    });
    await page.goto("/landlords/10000000-0000-4000-8000-000000000004");
    await expect(
      page.getByText("Updated fictional experience:", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Management 2 / 5");
    await page.screenshot({
      path: info.outputPath("landlord-review-result.png"),
      fullPage: true,
    });
    await page.goto("/account/reviews");
    await page.getByRole("button", { name: "Delete review" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm delete" }).click();
    await expect(page.locator(".review-status")).toHaveText("deleted");
    await expect(page.locator(".review-dates")).toContainText("01 Jan 2024");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByLabel("Move-out date", { exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "Update move-out date", exact: true }).click();
    const moveOut = page.getByRole("dialog", { name: "Update move-out date", exact: true });
    await expect(moveOut).toBeVisible();
    await moveOut.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(moveOut).not.toBeVisible();
    await page.getByRole("button", { name: "Update move-out date", exact: true }).click();
    await moveOut.getByLabel("Move-out date", { exact: true }).fill("2024-12-02");
    await moveOut.getByRole("button", { name: "Save move-out date", exact: true }).click();
    await expect(moveOut.getByRole("status")).toContainText("Tenancy end saved");
    await moveOut.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator(".review-dates")).toContainText("02 Dec 2024");
    expect((await page.request.get(url!)).status()).toBe(404);
  } finally {
    if (paths.length) await admin.storage.from("review-photos").remove(paths);
    cleanupReviewUser(u.data.user!.id);
    expect(
      (await admin.auth.admin.deleteUser(u.data.user!.id)).error,
    ).toBeNull();
  }
});
