import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";

test("review photos support selection, removal, five attachments and interrupted-upload recovery", async ({ page }) => {
  test.setTimeout(150000);
  const config = localBackendConfiguration();
  if (!config) throw new Error("Local test backend required");
  const admin = createClient(config.url, config.serviceKey, { auth: { persistSession: false } });
  const email = `review-photos-${crypto.randomUUID()}@example.test`;
  const password = "Synthetic review photo password";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const property = "20000000-0000-4000-8000-000000000003";
  const png = await sharp({ create: { width: 200, height: 100, channels: 3, background: "green" } }).png().toBuffer();
  const photo = (n: number) => ({ name: `room-${n}.png`, mimeType: "image/png", buffer: png });
  let reviewId: string | undefined;
  try {
    await page.goto(`/reviews/new?property=${property}`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByLabel("Your experience")).toBeVisible();
    await page.getByLabel("Tenancy start").fill("2024-01-01");
    await page.getByLabel("Monthly rent paid (INR)").fill("15000");
    for (const group of await page.locator('.criteria-form [role="radiogroup"]').all())
      await group.getByRole("radio", { name: "4 out of 5", exact: true }).check();
    await page.getByLabel("Your experience").fill("The rooms were clean and the water supply was reliable.");
    await page.getByLabel("Your experience").press("Tab");
    await expect(page.getByText("AI language checking is not configured.", { exact: false })).toBeVisible();
    const picker = page.locator('.review-photo-picker input[type="file"]');
    await picker.setInputFiles({ name: "document.pdf", mimeType: "application/pdf", buffer: Buffer.from("invalid") });
    await expect(page.locator(".review-photo-error")).toContainText("JPG, PNG or WebP");
    await picker.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(3145729) });
    await expect(page.locator(".review-photo-error")).toContainText("3 MiB");
    await picker.setInputFiles(Array.from({ length: 6 }, (_, i) => photo(i)));
    await expect(page.locator(".review-photo-selection li")).toHaveCount(5);
    await expect(page.locator(".review-photo-picker-heading small")).toContainText("5/5");
    await page.getByRole("button", { name: "Remove room-0.png", exact: true }).click();
    await expect(page.locator(".review-photo-selection li")).toHaveCount(4);
    await picker.setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
    await expect(page.getByRole("button", { name: "Remove fake.png", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel("This is a fictional").check();
    await expect(page.getByRole("button", { name: "Publish review", exact: true })).toBeEnabled({ timeout: 30000 });
    await expect(page.locator(".review-photo-selection li")).toHaveCount(5);
    await page.getByRole("button", { name: "Publish review", exact: true }).click();
    await expect(page.locator(".review-photo-selection li")).toHaveCount(5);
    await page.getByRole("button", { name: "Confirm and publish", exact: true }).click();
    await expect(page.getByText(/Your review is saved\. Photo rejected/)).toBeVisible({ timeout: 30000 });
    await expect(page.locator(".review-photo-selection li")).toHaveCount(1);
    await page.getByRole("button", { name: "Remove fake.png" }).click();
    await expect(page.locator(".review-photo-selection li")).toHaveCount(0);
    await picker.setInputFiles(photo(9));
    await page.getByRole("button", { name: "Retry photo uploads" }).click();
    await expect(page).toHaveURL(/\/account\/reviews$/, { timeout: 30000 });
    const edit = await page.getByRole("link", { name: "Edit review", exact: true }).getAttribute("href");
    reviewId = edit?.split("/")[2];
    expect(reviewId).toBeTruthy();
    const client = createClient(config.url, config.publicKey);
    const attached = await client.rpc("get_review_photos", { p_review: reviewId });
    expect(attached.error).toBeNull();
    expect(attached.data).toHaveLength(5);
    await page.goto(`/properties/${property}`);
    const card = page.locator(`#review-${reviewId}`);
    await expect(card.locator(".review-attachment-thumbnails")).toHaveCount(0);
    await card.getByRole("button", { name: "View 5 photos attached to this review" }).click();
    await expect(page.getByRole("dialog", { name: /Photos attached/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto(edit!);
    await expect(page.locator(".review-photo-picker-heading small")).toContainText("5/5");
    await expect(page.getByRole("button", { name: "Add Photos", exact: true })).toBeDisabled();
    await page.locator('#review-photos input[type="file"]').setInputFiles(photo(10));
    await page.getByRole("button", { name: "Add photo", exact: true }).click();
    await expect(page.locator("#review-photos").getByRole("alert")).toContainText("Maximum five photos");
    await page.goto("/reviews/new?property=20000000-0000-4000-8000-000000000001");
    await page.getByLabel("Tenancy start").fill("2024-01-01");
    await page.getByLabel("Monthly rent paid (INR)").fill("12000");
    for (const group of await page.locator('.criteria-form [role="radiogroup"]').all())
      await group.getByRole("radio", { name: "4 out of 5", exact: true }).check();
    await page.getByLabel("This is a fictional").check();
    await page.getByLabel("Your experience").fill("The rooms were clean and the water supply was reliable.");
    await page.getByLabel("Your experience").press("Tab");
    await expect(page.getByRole("button", { name: "Publish review", exact: true })).toBeEnabled({ timeout: 30000 });
    await page.getByRole("button", { name: "Publish review", exact: true }).click();
    await page.getByRole("button", { name: "Confirm and publish", exact: true }).click();
    await expect(page).toHaveURL(/\/account\/reviews$/, { timeout: 30000 });
    await expect(page.locator(".own-review-card")).toHaveCount(2);
  } finally {
    if (reviewId) {
      const objects = await admin.storage.from("review-photos").list(reviewId);
      if (objects.data?.length) await admin.storage.from("review-photos").remove(objects.data.map(o => `${reviewId}/${o.name}`));
    }
    if (created.data.user) await admin.auth.admin.deleteUser(created.data.user.id);
  }
});
