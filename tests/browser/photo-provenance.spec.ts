import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
import { cleanupReviewUser } from "../helpers/review-cleanup";
import { fixtureAdmin } from "../helpers/admin-fixture";
const c = localBackendConfiguration();
if (!c) throw new Error("Local backend required");
test("landlord photos preserve source, change verification with claims and obey moderation", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const email = "photo-browser-" + crypto.randomUUID() + "@example.test",
    password = "Synthetic photo browser password";
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const user = data.user!.id,
    fixtureDocument = crypto.randomUUID();
  let property: string | undefined;
  const client = createClient(c.url, c.publicKey, {
    auth: { persistSession: false },
  });
  const paths: string[] = [];
  const jpeg = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "#296047" },
  })
    .jpeg()
    .toBuffer();
  try {
    expect(
      (await client.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    const place = await client.rpc("create_property", {
      p_input: {
        name: "Synthetic photo fixture " + crypto.randomUUID(),
        address: "Synthetic photo lane " + crypto.randomUUID(),
        state: "Delhi",
        city: "Photo fixture city",
        locality: "Photo fixture area",
        type: "Flat",
        min: 1000,
        max: 2000,
        synthetic: true,
      },
    });
    expect(place.error).toBeNull();
    property = place.data;
    expect(
      (
        await service.storage
          .from("rental-documents")
          .upload("claim/" + fixtureDocument + ".jpg", jpeg, {
            contentType: "image/jpeg",
          })
      ).error,
    ).toBeNull();
    const claim = await service.rpc("register_claim_document", {
      p_user: user,
      p_property: property,
      p_landlord: null,
      p_document: fixtureDocument,
    });
    expect(claim.error).toBeNull();
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/properties/" + property);
    await page
      .getByLabel("Landlord photo", { exact: true })
      .setInputFiles({
        name: "spoof.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("not an image"),
      });
    await page
      .getByRole("button", { name: "Add landlord photo", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Choose a valid");
    await page
      .getByLabel("Landlord photo", { exact: true })
      .setInputFiles({
        name: "fictional.jpg",
        mimeType: "image/jpeg",
        buffer: jpeg,
      });
    await page
      .getByRole("button", { name: "Add landlord photo", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Landlord photo added",
    );
    const own = await client.rpc("get_my_property_photos", {
      p_property: property,
    });
    expect(own.error).toBeNull();
    const photo = own.data[0].id,
      url = "/api/photos/" + photo;
    paths.push("property/" + property + "/" + photo + ".jpg");
    const figure = page
      .locator("figure")
      .filter({ has: page.locator('img[src="' + url + '"]') });
    await expect(figure).toContainText("Shared by landlord");
    await expect(figure).toContainText("Unverified landlord");
    expect((await page.request.get(url)).status()).toBe(200);
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
      path: info.outputPath("landlord-photo-pending.png"),
      fullPage: true,
    });
    fixtureAdmin(user, true);
    expect(
      (
        await client.rpc("decide_claim", {
          p_claim: claim.data,
          p_decision: "approved",
          p_reason: "Synthetic test evidence approved",
        })
      ).error,
    ).toBeNull();
    await page.reload();
    await expect(figure).toContainText("Verified landlord");
    await page.screenshot({
      path: info.outputPath("landlord-photo-approved.png"),
      fullPage: true,
    });
    await figure.getByText("Report this photo", { exact: true }).click();
    await figure
      .getByLabel("Photo report reason")
      .fill("Synthetic photo report for moderation test");
    await figure.getByRole("button", { name: "Submit photo report" }).click();
    await expect(figure.getByRole("status")).toContainText("Photo reported");
    await page.goto("/admin/reports");
    const card = page
      .locator("section.dashboard-card")
      .filter({ hasText: "Synthetic photo report for moderation test" });
    await card.getByLabel("Photo report decision").selectOption("removed");
    await card
      .getByLabel("Photo decision reason")
      .fill("Synthetic moderation removal after inspection");
    await card.getByRole("button", { name: "Save photo decision" }).click();
    await expect(card).toContainText("removed");
    expect((await page.request.get(url)).status()).toBe(404);
    fixtureAdmin(user, false);
  } finally {
    fixtureAdmin(user, false);
    if (paths.length)
      expect(
        (await service.storage.from("review-photos").remove(paths)).error,
      ).toBeNull();
    expect(
      (
        await service.storage
          .from("rental-documents")
          .remove(["claim/" + fixtureDocument + ".jpg"])
      ).error,
    ).toBeNull();
    cleanupReviewUser(user);
    if (property)
      expect(
        (await service.from("properties").delete().eq("id", property)).error,
      ).toBeNull();
    expect((await service.auth.admin.deleteUser(user)).error).toBeNull();
  }
});
