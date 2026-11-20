import { expect, test as base, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { assistantAccount } from "../helpers/assistant-account";

const test = base.extend<{ signedInPage: Page }>({
  signedInPage: async ({ page }, use) => {
    const { clean } = await assistantAccount(page);
    try { await use(page); } finally { await clean(); }
  },
});

test("assistant keeps search context and asks before using device location", async ({ signedInPage: page }, info) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, fail: PositionErrorCallback) => {
          sessionStorage.setItem("assistant-location-requested", "true");
          fail({ code: 1 } as GeolocationPositionError);
        },
      },
    });
  });

  await page.goto("/search?city=Jaipur");
  const launcher = page.getByRole("button", { name: "Open RentWise" });
  const assistant = page.getByRole("region", { name: "RentWise" });
  await launcher.click();
  await expect(assistant.getByText("Hi! I'm RentWise 👋 I can help you discover properties, understand reviews, and navigate RentCheck.", { exact: true })).toBeVisible();
  const message = assistant.getByRole("textbox", { name: "Message" });
  async function ask(text: string) {
    await message.fill(text);
    await assistant.getByRole("button", { name: "Send message" }).click();
  }

  await ask("Find properties in Jaipur");
  await expect(assistant.getByRole("article").first()).toBeVisible({ timeout: 20000 });
  await expect(assistant.getByRole("link", { name: "View properties", exact: true }).last())
    .toHaveAttribute("href", /city=Jaipur/);
  await ask("Under ₹15,000");
  const filtered = assistant.getByRole("link", { name: "View properties", exact: true }).last();
  await expect(filtered).toHaveAttribute("href", /city=Jaipur.*max=15000/, { timeout: 20000 });
  await page.screenshot({ path: info.outputPath("assistant-results.png") });
  await filtered.click();
  await expect(page).toHaveURL(url => url.pathname === "/search" && url.searchParams.get("city") === "Jaipur" && url.searchParams.get("max") === "15000");
  await expect(assistant).toHaveCount(0);
  await launcher.click();
  await expect(assistant.getByText("Under ₹15,000", { exact: false }).first()).toBeVisible();

  await assistant.getByRole("button", { name: "New chat" }).click();
  await expect(assistant.getByRole("article")).toHaveCount(0);
  await ask("Recommend properties near me");
  const locate = assistant.getByRole("button", { name: "Use my location" });
  await expect(locate).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => sessionStorage.getItem("assistant-location-requested"))).toBeNull();
  await locate.click();
  await expect(assistant.getByText(/I couldn’t access your location/)).toBeVisible();
  await ask("Jaipur");
  await expect(assistant.getByRole("article").first()).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('[aria-labelledby="rentcheck-assistant-title"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await message.press("Escape");
  await expect(launcher).toBeFocused();
  await launcher.click();
  await assistant.getByRole("button", { name: "Close assistant" }).click();
  await expect(assistant).toHaveCount(0);
});

test("assistant returns public answers and links protected tasks to the account pages", async ({ request }) => {
  const send = (message: string) => request.post("/api/assistant", { data: { message } });
  const count = await send("How many properties are listed on RentCheck?");
  expect(count.ok()).toBe(true);
  expect((await count.json()).text).toMatch(/\b\d+(?:,\d+)* (?:property|properties) on RentCheck/);
  const reviews = await send("Where can I see my reviews?");
  expect(reviews.ok()).toBe(true);
  expect((await reviews.json()).links).toContainEqual({ label: "Your reviews", href: "/account/reviews" });
  const bad = await request.post("/api/assistant", { data: { message: "Test", privateDocument: "ignored" } });
  expect(bad.status()).toBe(400);
});

test("assistant shows the same near-budget alternatives as Explore", async ({ signedInPage: page }) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "Open RentWise" }).click();
  const assistant = page.getByRole("region", { name: "RentWise" });
  const message = assistant.getByRole("textbox", { name: "Message" });
  const send = assistant.getByRole("button", { name: "Send message" });
  await message.fill("Find properties in Chennai under 6k");
  await send.click();
  const alternative = assistant.getByRole("region", { name: "Near your budget" });
  const lotus = "View property: Demo Lotus Hostel";
  await expect(alternative.getByRole("link", { name: lotus })).toBeVisible();
  await expect(alternative).toContainText("Starting rent above ₹6,000");

  await message.fill("Under 6k or 7k");
  await send.click();
  const searchLink = assistant.getByRole("link", { name: "View properties", exact: true }).last();
  await expect(searchLink).toHaveAttribute("href", /city=Chennai.*max=7000/);
  await expect(assistant.getByRole("link", { name: lotus })).toHaveCount(2);
  await expect(alternative.getByRole("link", { name: lotus })).toHaveCount(1);
});

test("RentWise updates the search area as the user changes requirements", async ({ signedInPage: page }) => {
  await page.goto("/search?city=Chennai");
  await page.getByRole("button", { name: "Open RentWise" }).click();
  const assistant = page.getByRole("region", { name: "RentWise" });
  const links = assistant.getByRole("link", { name: "View properties", exact: true });
  async function ask(text: string) {
    await assistant.getByRole("textbox", { name: "Message" }).fill(text);
    await assistant.getByRole("button", { name: "Send message" }).click();
  }

  await ask("Find properties in Chennai under 6k");
  await expect(links.last()).toHaveAttribute("href", /city=Chennai.*max=6000/);

  await ask("pripety under 4000 , anywhere");
  await expect(links.last()).toHaveAttribute("href", "/search?max=4000");

  await ask("property in jaiour under 4000");
  await expect(links.last()).toHaveAttribute("href", "/search?state=Rajasthan&city=Jaipur&max=4000");

  await ask("in Qwertyville under 3k");
  await expect(assistant.getByText(/I couldn’t find “Qwertyville”/)).toBeVisible();
  await expect(links).toHaveCount(3);

  await ask("Anywhere");
  await expect(links.last()).toHaveAttribute("href", "/search?max=3000");

  await ask("Anywhere in Jaipur");
  await expect(links.last()).toHaveAttribute("href", "/search?state=Rajasthan&city=Jaipur&max=3000");
});

test("RentWise keeps a misspelled rent cap in both chat and Explore", async ({ signedInPage: page }) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "Open RentWise" }).click();
  const assistant = page.getByRole("region", { name: "RentWise" });
  await assistant.getByRole("textbox", { name: "Message" }).fill("show places undeer 3000");
  await assistant.getByRole("button", { name: "Send message" }).click();
  await expect(assistant.getByRole("link", { name: "View properties", exact: true })).toHaveAttribute("href", "/search?max=3000");
  await expect(assistant.getByRole("link", { name: "View property: Demo Garden House" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/search\?max=3000$/);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Filter places" }).getByLabel("Maximum rent")).toHaveValue("3000");
});

test("RentWise updates and clears individual requirements before resetting the search", async ({ signedInPage: page }) => {
  await page.goto("/search?state=Rajasthan&city=Jaipur&max=15000&type=PG&rating=4&eligibility=female_bachelors&verification=reviews&women=recommended");
  await page.getByRole("button", { name: "Open RentWise" }).click();
  const assistant = page.getByRole("region", { name: "RentWise" });
  const send = assistant.getByRole("button", { name: "Send message" });
  const message = assistant.getByRole("textbox", { name: "Message" });
  let expected: Record<string, string> = {
    state: "Rajasthan", city: "Jaipur", max: "15000", type: "PG", rating: "4",
    eligibility: "female_bachelors", verification: "reviews", women: "recommended",
  };
  async function apply(text: string, changes: Record<string, string | null>) {
    expected = { ...expected };
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) delete expected[key];
      else expected[key] = value;
    }
    await message.fill(text);
    await send.click();
    await expect(page).toHaveURL(url => url.pathname === "/search" &&
      url.searchParams.size === Object.keys(expected).length &&
      Object.entries(expected).every(([key, value]) => url.searchParams.get(key) === value), { timeout: 20000 });
  }

  await apply("Change Jaipur to Delhi", { city: "New Delhi", state: "Delhi" });
  await apply("Location doesn't matter", { city: null, state: null });
  await apply("Remove the women recommendation filter", { women: null });
  await apply("Remove the budget restriction", { max: null });
  await apply("Change PG to Flat", { type: "Flat" });
  await apply("Show all property types", { type: null });
  await apply("Any tenant type is fine", { eligibility: null });
  await apply("Start a fresh search", { rating: null, verification: null });
});
