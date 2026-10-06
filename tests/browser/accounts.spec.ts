import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import {
  applicationBackendConfigured,
  localBackendConfiguration,
} from "../helpers/local-backend";

const configured = applicationBackendConfigured();
const backend = localBackendConfiguration();

test("account pages are accessible, responsive and honest about connection state", async ({
  page,
}, testInfo) => {
  for (const path of ["/sign-in", "/register"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    if (!configured)
      await expect(
        page.getByText("Accounts aren’t connected yet."),
      ).toBeVisible();
    else await expect(page.getByLabel("Email address")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(path.slice(1) + ".png"),
      fullPage: true,
    });
  }
});

test("anonymous pages redirect and APIs deny account/admin access", async ({
  page,
  request,
}) => {
  for (const path of ["/account", "/admin", "/reviews/new"]) {
    await page.goto(path);
    await expect(page).toHaveURL(
      new RegExp(`/sign-in\\?next=${encodeURIComponent(path)}$`),
    );
    expect(await page.locator("body").textContent()).not.toContain(
      "Private account details",
    );
  }
  expect((await request.get("/api/account")).status()).toBe(401);
  expect((await request.get("/api/admin/access")).status()).toBe(401);
  if (backend) {
    await page.context().addCookies([
      {
        name: `sb-${new URL(backend.url).hostname.split(".")[0]}-auth-token`,
        value: `base64-${Buffer.from(JSON.stringify({ access_token: "forged", refresh_token: "forged", expires_at: 9999999999 })).toString("base64url")}`,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount$/);
    expect((await page.request.get("/api/account")).status()).toBe(401);
  }
});

test("invalid callbacks cannot create a session or redirect outside the site", async ({
  page,
}) => {
  for (const path of [
    "/auth/callback?next=https://evil.example",
    "/auth/callback?code=invalid&next=//evil.example",
    "/auth/confirm?token_hash=invalid&type=email&next=https://evil.example",
    "/auth/confirm?token_hash=invalid&type=recovery",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in\?notice=auth-error$/);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Sign-in couldn’t finish",
    );
  }
});

test("server validates account forms without sending invalid data to auth", async ({
  page,
}, testInfo) => {
  test.skip(!configured, "No account backend configuration in this run.");
  await page.goto("/register");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "highlighted fields",
  );
  await page.getByLabel("Email address").fill("bad-email");
  await page.getByLabel("Public alias").fill("tenant@example.test");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password").fill("different");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("#email-error")).toBeVisible();
  await expect(page.locator("#alias-error")).toBeVisible();
  await expect(page.locator("#password-error")).toBeVisible();
  await expect(page.locator("#confirmPassword-error")).toBeVisible();
  await expect(page.locator(".skip-link")).toHaveCSS("opacity", "0");
  expect(
    await page
      .locator(".skip-link")
      .evaluate((link) => link.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(0);
  await page.screenshot({
    path: testInfo.outputPath("validation.png"),
    fullPage: true,
  });
});

test("live account persists, public alias changes, admin remains denied, and logout protects reviews", async ({
  page,
}, testInfo) => {
  test.skip(
    !backend || !configured,
    "Live journeys require the isolated local Supabase backend.",
  );
  const admin = createClient(backend!.url, backend!.serviceKey, {
    auth: { persistSession: false },
  });
  const email = `phase1-browser-${crypto.randomUUID()}@example.test`;
  const password = "Synthetic browser passphrase 2026";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { public_alias: "CalmTenant", is_administrator: true },
  });
  expect(error).toBeNull();
  try {
    await page.goto("/reviews/new");
    await page.getByLabel("Email address").fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("Incorrect synthetic password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "couldn’t sign you in",
    );
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\/new$/);
    await expect(
      page.getByRole("heading", { name: "Share your tenancy experience" }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("review-boundary.png"),
      fullPage: true,
    });
    await page.goto("/account");
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(page.getByText("Not granted", { exact: true })).toBeVisible();
    await page.getByLabel("Public alias").fill("CalmTenantUpdated");
    await page.getByRole("button", { name: "Save alias" }).click();
    await expect(page.getByRole("status")).toContainText("has been saved");
    await page.reload();
    await expect(page.getByLabel("Public alias")).toHaveValue(
      "CalmTenantUpdated",
    );
    await page.screenshot({
      path: testInfo.outputPath("account.png"),
      fullPage: true,
    });
    expect((await page.request.get("/api/admin/access")).status()).toBe(403);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Access restricted." }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("admin-restricted.png"),
      fullPage: true,
    });
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in\?notice=signed-out$/);
    await expect(page.getByRole("status")).toContainText("signed out");
    await page.goto("/reviews/new");
    await expect(page).toHaveURL(/\/sign-in\?next=/);
    expect((await page.request.get("/api/account")).status()).toBe(401);
  } finally {
    if (data.user) await admin.auth.admin.deleteUser(data.user.id);
  }
});

test("registration sends a real local confirmation email and confirmation creates a session", async ({
  page,
  request,
}) => {
  test.skip(
    !backend || !configured,
    "Local mail capture and Supabase are required.",
  );
  const admin = createClient(backend!.url, backend!.serviceKey, {
    auth: { persistSession: false },
  });
  const email = `phase1-confirm-${crypto.randomUUID()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Public alias").fill("NewTenant");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic confirmation passphrase 2026");
  await page
    .getByLabel("Confirm password")
    .fill("Synthetic confirmation passphrase 2026");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  try {
    await expect(page.getByRole("status")).toContainText("Check your email");
    let messageId: string | undefined;
    await expect
      .poll(async () => {
        const response = await request.get(
          `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        );
        const list = await response.json();
        messageId = list.messages?.[0]?.ID;
        return !!messageId;
      })
      .toBe(true);
    const message = await (
      await request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`)
    ).json();
    const confirmation = String(message.HTML)
      .match(/href="([^"]+\/auth\/confirm[^"]+)"/)?.[1]
      ?.replaceAll("&amp;", "&");
    expect(confirmation).toBeTruthy();
    await page.goto(confirmation!);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByLabel("Public alias")).toHaveValue("NewTenant");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in\?notice=signed-out$/);
    await page.goto(confirmation!);
    await expect(page).toHaveURL(/\/sign-in\?notice=auth-error$/);
  } finally {
    const users = await admin.auth.admin.listUsers({ perPage: 1000 });
    const created = users.data.users.find((user) => user.email === email);
    if (created) await admin.auth.admin.deleteUser(created.id);
  }
});

test("trusted administrator grant works and revocation takes effect in the same session", async ({
  page,
}, testInfo) => {
  test.skip(
    !backend || !configured,
    "Requires isolated local database and auth.",
  );
  const admin = createClient(backend!.url, backend!.serviceKey, {
    auth: { persistSession: false },
  });
  const email = `phase1-admin-${crypto.randomUUID()}@example.test`;
  const password = "Synthetic admin passphrase 2026";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const userId = data.user!.id;
  if (!/^[0-9a-f-]{36}$/.test(userId))
    throw new Error("Invalid synthetic fixture identity.");
  const runFixtureSql = (sql: string) =>
    execFileSync(
      "docker",
      [
        "exec",
        "supabase_db_rentcheck-accounts-test",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        sql,
      ],
      { stdio: "pipe" },
    );
  try {
    runFixtureSql(
      `insert into private.administrator_grants(user_id, reason) values ('${userId}', 'Synthetic browser test grant');`,
    );
    await page.goto("/sign-in?next=/admin");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Administrator access verified." }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("admin-granted.png"),
      fullPage: true,
    });
    expect((await page.request.get("/api/admin/access")).status()).toBe(200);
    runFixtureSql(
      `delete from private.administrator_grants where user_id = '${userId}';`,
    );
    expect((await page.request.get("/api/admin/access")).status()).toBe(403);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Access restricted." }),
    ).toBeVisible();
  } finally {
    await admin.auth.admin.deleteUser(userId);
  }
});
