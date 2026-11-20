import { test, expect } from "@playwright/test";
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
