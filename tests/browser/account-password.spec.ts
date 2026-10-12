import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";

test("account password change verifies current password and enables the new password", async ({ page }, info) => {
  const config = localBackendConfiguration();
  if (!config) throw new Error("Local backend required");
  const admin = createClient(config.url, config.serviceKey, { auth: { persistSession: false } });
  const email = `account-${crypto.randomUUID()}@example.test`;
  const password = "Synthetic original password 42";
  const nextPassword = "Synthetic updated password 84";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(error).toBeNull();
  try {
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText("Administrator access", { exact: true })).toHaveCount(0);
    await expect(page.locator(".account-user-summary .profile-avatar")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("account.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Change password", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Change password", exact: true });
    await dialog.getByLabel("Current password", { exact: true }).fill("Incorrect current password");
    await dialog.getByLabel("New password", { exact: true }).fill(nextPassword);
    await dialog.getByLabel("Confirm new password", { exact: true }).fill(nextPassword);
    await dialog.getByRole("button", { name: "Update password", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("could not be verified");
    await dialog.getByLabel("Current password", { exact: true }).fill(password);
    await dialog.getByRole("button", { name: "Update password", exact: true }).click();
    await expect(dialog.getByRole("status")).toHaveText("Your password has been changed.");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(nextPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
  } finally {
    if (data.user) await admin.auth.admin.deleteUser(data.user.id);
  }
});
