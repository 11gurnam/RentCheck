import { test, expect } from "@playwright/test";

test("rent caps keep above-budget alternatives separate from matches", async ({ page }) => {
  await page.goto("/search?city=Chennai&q=Demo+Lotus+Hostel");
  const dialog = page.getByRole("dialog", { name: "Filter places" });
  const alternatives = page.getByRole("region", { name: "Near your budget" });
  const lotus = page.getByRole("link", { name: "Demo Lotus Hostel", exact: true });

  async function applyBudget(value: string) {
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await dialog.getByLabel("Maximum rent").fill(value);
    await dialog.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("max") === value);
  }

  await applyBudget("6000");
  await expect(page.getByRole("heading", { name: "No matching places" })).toBeVisible();
  await expect(alternatives).toContainText("₹6,000");
  await expect(alternatives.getByRole("link", { name: "Demo Lotus Hostel", exact: true })).toBeVisible();
  await expect(lotus).toHaveCount(1);

  await applyBudget("7000");
  await expect(page.getByText("place found", { exact: true })).toBeVisible();
  await expect(lotus).toBeVisible();
  await expect(alternatives).toHaveCount(0);
});

test("filters overlay results and retain selections when searching", async ({ page }, info) => {
 await page.goto("/search");
 const dialog = page.getByRole("dialog", { name: "Filter places" });
 await expect(dialog).not.toBeVisible();
 await page.getByRole("button", { name: "Filters", exact: true }).click();
 await expect(dialog).toBeVisible();
 const bounds = await dialog.boundingBox();
 const viewport = page.viewportSize()!;
 expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThan(3);
 expect(Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2)).toBeLessThan(3);
 await dialog.getByLabel("Accommodation type").selectOption("House");
 await page.screenshot({ path: info.outputPath("filter-popup.png") });
 await dialog.getByRole("button", { name: "Apply filters" }).click();
 await expect(page).toHaveURL(/type=House/);
 await expect(dialog).not.toBeVisible();
 await expect(page.locator(".accommodation-result-count strong")).toBeVisible();
 await page.getByRole("button", { name: "Filters", exact: true }).click();
 await expect(dialog.getByLabel("Accommodation type")).toHaveValue("House");
 await page.keyboard.press("Escape");
 await expect(dialog).not.toBeVisible();
 await page.getByLabel("Property, address or manager").fill("Garden");
 await page.getByRole("button", { name: "Search", exact: true }).click();
 await expect(page).toHaveURL(/q=Garden/);
 expect(new URL(page.url()).searchParams.get("type")).toBe("House");
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("voice search populates the existing form and leaves submission to the user", async ({ page }) => {
  await page.addInitScript(() => {
    class TestRecognition {
      lang = "";
      onstart?: () => void;
      onend?: () => void;
      onerror?: (event: { error: string }) => void;
      onresult?: (event: { results: unknown[] }) => void;
      start() {
        const root = document.documentElement;
        root.dataset.voiceStarts = String(Number(root.dataset.voiceStarts ?? "0") + 1);
        root.dataset.voiceLanguage = this.lang;
        if (root.dataset.voiceError) this.onerror?.({ error: root.dataset.voiceError });
        else this.onstart?.();
      }
      stop() {
        this.onresult?.({ results: [{ isFinal: true, 0: { transcript: "Find properties in Jaipur, Rajasthan." } }] });
        this.onend?.();
      }
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: TestRecognition });
  });
  await page.goto("/search?type=House&max=15000");
  const root = page.locator("html");
  await expect(root).not.toHaveAttribute("data-voice-starts", /./);
  await page.getByRole("button", { name: "Search using voice", exact: true }).click();
  await expect(root).toHaveAttribute("data-voice-language", "en-IN");
  await expect(page.getByRole("status")).toContainText("Listening");
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await expect(page.getByLabel("Property, address or manager")).toHaveValue("Jaipur");
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filters = page.getByRole("dialog", { name: "Filter places" });
  await expect(filters.getByLabel("City", { exact: true })).toHaveValue("Jaipur");
  await expect(filters.getByLabel("State / union territory")).toHaveValue("Rajasthan");
  await expect(filters.getByLabel("Accommodation type")).toHaveValue("House");
  await expect(filters.getByLabel("Maximum rent")).toHaveValue("15000");
  await page.keyboard.press("Escape");

  await root.evaluate(element => { element.dataset.voiceError = "language-not-supported"; });
  await page.getByRole("button", { name: "Search using voice", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Try again to use another English");
  await root.evaluate(element => { element.dataset.voiceError = "no-speech"; });
  await page.getByRole("button", { name: "Search using voice", exact: true }).click();
  await expect(root).toHaveAttribute("data-voice-language", "en-US");
  await expect(page.getByRole("status")).toContainText("didn’t hear any words");
  await root.evaluate(element => { element.dataset.voiceError = "not-allowed"; });
  await page.getByRole("button", { name: "Search using voice", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Microphone access is required");
  await page.getByLabel("Property, address or manager").fill("Jaipur Garden");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("q") === "Jaipur Garden" && url.searchParams.get("city") === "Jaipur");
});

test("property information filters submit independently and Anyone clears other groups", async ({ page }) => {
  await page.goto("/search?city=Jaipur");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filter places" });
  const groups = dialog.getByRole("group", { name: "Landlord-stated rental preferences" });
  const women = groups.getByRole("checkbox", { name: "Women tenants", exact: true });
  const couples = groups.getByRole("checkbox", { name: "Couples", exact: true });
  const anyone = groups.getByRole("checkbox", { name: "Anyone", exact: true });
  await women.check();
  await couples.check();
  await anyone.check();
  await expect(women).not.toBeChecked();
  await expect(couples).not.toBeChecked();
  await women.check();
  await couples.check();
  await expect(anyone).not.toBeChecked();
  await dialog.getByLabel("RentCheck tenant verification").selectOption("former");
  await dialog.getByLabel("Women’s tenant recommendations").selectOption("safety");
  await dialog.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(url => url.searchParams.getAll("eligibility").length === 2);
  const params = new URL(page.url()).searchParams;
  expect(params.getAll("eligibility")).toEqual(expect.arrayContaining(["women","couples"]));
  expect(params.get("city")).toBe("Jaipur");
  expect(params.get("verification")).toBe("former");
  expect(params.get("women")).toBe("safety");
  await expect(page.getByRole("heading", { name: "Check your filters." })).toHaveCount(0);
});

test("search keeps property summaries compact and the detail page retains the source sections", async ({ page }) => {
  await page.goto("/search?city=Jaipur");
  const card = page.locator(".search-property-card").filter({ has: page.getByRole("link", { name: "Demo Rose Studio", exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.locator("section")).toHaveCount(0);
  await expect(card).not.toContainText(/Not enough|No verified tenant reviews|No landlord-stated preferences/);
  await expect(card.getByRole("button", { name: "Add photos" })).toHaveCount(0);
  await expect(page.locator(".search-property-card summary")).toHaveCount(0);
  await expect(card.getByRole("link", { name: "Compare properties" })).toHaveCount(0);
  await page.locator(".results-heading").getByRole("link", { name: "Compare properties" }).click();
  await expect(page.getByRole("heading", { name: "Compare accommodation" })).toBeVisible();
  await page.goBack();
  await card.getByRole("link", { name: "Demo Rose Studio", exact: true }).click();
  const detail = page.locator(".property-detail-page");
  await expect(detail.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "32px");
  for (const name of ["Landlord-stated rental preferences", "RentCheck tenant verification"]) {
    await expect(detail.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(detail.locator("#women-experiences")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
