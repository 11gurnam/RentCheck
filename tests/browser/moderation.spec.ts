import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { cleanupReviewUser } from "../helpers/review-cleanup";
const c = localBackendConfiguration();
if (!c) throw new Error("Local backend required");
test("reports stay visible, history preserves snapshots, and merge requires explicit conflict resolutions", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120000);
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const users: { id: string; email: string; password: string }[] = [],
    clients: (typeof service)[] = [],
    properties: string[] = [];
  const photoPaths: string[] = [];
  const adminContext = await browser.newContext(),
    admin = await adminContext.newPage();
  async function login(p: typeof page, n: number) {
    await p.goto("/sign-in");
    await p.getByLabel("Email address").fill(users[n].email);
    await p.getByLabel("Password", { exact: true }).fill(users[n].password);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(p).toHaveURL(/\/account$/);
  }
  try {
    for (let n = 0; n < 2; n++) {
      const email =
          "moderation-browser-" + crypto.randomUUID() + "@example.test",
        password = "Synthetic moderation browser password";
      const u = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          public_alias: "ModerationVoice-" + crypto.randomUUID().slice(0, 6),
        },
      });
      expect(u.error).toBeNull();
      users.push({ id: u.data.user!.id, email, password });
      const client = createClient(c.url, c.publicKey, {
        auth: { persistSession: false },
      });
      await client.auth.signInWithPassword({ email, password });
      clients.push(client);
    }
    const tag = crypto.randomUUID().slice(0, 8);
    for (let n = 0; n < 2; n++) {
      const p = await clients[0].rpc("create_property", {
        p_input: {
          name: "Fictional " + (n ? "Target " : "Source ") + tag,
          address: "Invented moderation lane " + crypto.randomUUID(),
          state: "Delhi",
          city: "Moderation test city",
          locality: "Fictional area",
          type: "Flat",
          min: 1000,
          max: 2000,
          synthetic: true,
        },
        p_acknowledged: true,
      });
      expect(p.error).toBeNull();
      properties.push(p.data);
      expect(
        (
          await clients[0].rpc("create_review", {
            p_input: {
              property: p.data,
              start: "2023-01-01",
              end: "2023-12-01",
              current: false,
              paid: 1500,
              propertyRating: 4,
              body:
                "Fictional " +
                (n ? "target" : "source") +
                " tenant review " +
                tag +
                " preserved for moderation checks.",
              synthetic: true,
            },
          })
        ).error,
      ).toBeNull();
    }
    const [source, target] = properties,
      body =
        "Fictional source tenant review " +
        tag +
        " preserved for moderation checks.";
    await login(page, 0);
    const sourceReview = (
      await clients[0].rpc("get_review_feed", { p_property: source })
    ).data[0].id;
    await page.goto("/reviews/" + sourceReview + "/edit");
    await page.getByLabel("Photo", { exact: true }).setInputFiles({
      name: "fictional.png",
      mimeType: "image/png",
      buffer: await sharp({
        create: { width: 400, height: 300, channels: 3, background: "#dce8e0" },
      })
        .png()
        .toBuffer(),
    });
    await page.getByRole("button", { name: "Add photo" }).click();
    await expect(page.getByRole("status")).toContainText("Photo added");
    const photoUrl = await page
      .getByRole("link", { name: "View photo" })
      .getAttribute("href");
    photoPaths.push(
      (
        await service.rpc("get_photo_path", {
          p_photo: photoUrl!.split("/").at(-1),
        })
      ).data,
    );
    await page.goto("/properties/" + source);
    const article = page
      .locator("article")
      .filter({ has: page.getByText(body, { exact: true }) });
    await article.getByText("Report this review", { exact: true }).click();
    await article
      .getByLabel("Report reason")
      .fill("Fictional concern submitted for administrator investigation.");
    await article.getByRole("button", { name: "Submit report" }).click();
    await expect(article.getByRole("status")).toContainText("remains visible");
    await expect(page.getByText(body, { exact: true })).toBeVisible();
    fixtureAdmin(users[1].id, true);
    await login(admin, 1);
    await admin.goto("/admin/reports");
    const card = admin
      .locator("section.dashboard-card")
      .filter({ has: admin.getByText(body, { exact: true }) });
    await card
      .getByLabel("Decision reason")
      .fill("Fictional investigation supports retaining this tenant account.");
    await card.getByRole("button", { name: "Save report decision" }).click();
    await expect(card).toContainText("kept");
    await admin.goto("/admin/associations?property=" + source);
    await admin
      .getByRole("combobox", { name: "Manager", exact: true })
      .selectOption("10000000-0000-4000-8000-000000000001");
    await admin.getByLabel("Start date", { exact: true }).fill("2024-01-01");
    await admin
      .getByLabel("Association change reason")
      .fill("Fictional new management begins after the recorded tenancy.");
    await admin.getByRole("button", { name: "Save management period" }).click();
    await expect(admin.getByRole("status")).toContainText(
      "snapshots remain unchanged",
    );
    await page.reload();
    await expect(article).toContainText("Management Unanswered");
    await admin.goto("/admin/merge?source=" + source + "&target=" + target);
    await admin
      .getByRole("combobox", { name: "Profile details to retain" })
      .selectOption("target");
    await admin
      .getByRole("combobox", { name: "Active management history to retain" })
      .selectOption("source");
    await admin
      .getByLabel("Merge decision reason")
      .fill("Fictional duplicate pair inspected with explicit resolutions.");
    await admin.getByLabel("I reviewed both fictional profiles").check();
    await admin
      .getByRole("button", { name: "Merge with these resolutions" })
      .click();
    await expect(admin.getByRole("status")).toContainText(
      "overlapping tenancies",
    );
    await admin.getByRole("checkbox", { name: /Target ·/ }).check();
    expect(
      (
        await new AxeBuilder({ page: admin })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await admin.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await admin.screenshot({
      path: info.outputPath("merge-resolutions.png"),
      fullPage: true,
    });
    await admin
      .getByRole("button", { name: "Merge with these resolutions" })
      .click();
    await expect(admin.getByRole("status")).toContainText(
      "merged transactionally",
    );
    expect((await page.request.get("/properties/" + source)).status()).toBe(
      404,
    );
    await page.goto("/properties/" + target);
    await expect(page.getByText(body, { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Fictional target tenant review " +
          tag +
          " preserved for moderation checks.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect(page.getByRole("main")).toContainText("Demo North Homes");
    await page.screenshot({
      path: info.outputPath("merged-profile.png"),
      fullPage: true,
    });
    expect((await page.request.get(photoUrl!)).status()).toBe(200);
    expect(
      (
        await clients[1].rpc("report_review", {
          p_review: sourceReview,
          p_reason: "Fictional second investigation for removal testing",
        })
      ).error,
    ).toBeNull();
    await admin.goto("/admin/reports");
    const pending = admin
      .locator("section.dashboard-card")
      .filter({ has: admin.getByText(body, { exact: true }) })
      .filter({ hasText: "pending · review visible" });
    await pending
      .getByRole("combobox", { name: "Report decision" })
      .selectOption("removed");
    await pending
      .getByLabel("Decision reason")
      .fill("Fictional reasoned removal excludes this review and photo.");
    await pending.getByRole("button", { name: "Save report decision" }).click();
    await expect(pending).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(body, { exact: true })).toHaveCount(0);
    expect((await page.request.get(photoUrl!)).status()).toBe(404);
    await admin.goto("/admin/audit");
    await expect(admin.getByRole("main")).toContainText("property_merge");
  } finally {
    await adminContext.close();
    if (photoPaths.length)
      await service.storage.from("review-photos").remove(photoPaths);
    for (const u of users) {
      cleanupReviewUser(u.id);
      expect((await service.auth.admin.deleteUser(u.id)).error).toBeNull();
    }
    if (properties.length) {
      await service
        .from("management_associations")
        .delete()
        .in("property_id", properties);
      expect(
        (await service.from("properties").delete().in("id", properties)).error,
      ).toBeNull();
    }
  }
});
