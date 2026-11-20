import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { fixtureAdmin } from "./admin-fixture";
import { applicationBackendConfigured, localBackendConfiguration } from "./local-backend";

export async function assistantAccount(page: Page, admin = false) {
  const config = localBackendConfiguration();
  if (!config || !applicationBackendConfigured()) throw new Error("Isolated local app backend required");
  const service = createClient(config.url, config.serviceKey, { auth: { persistSession: false } });
  const client = createClient(config.url, config.publicKey, { auth: { persistSession: false } });
  const email = "assistant-" + crypto.randomUUID() + "@example.test";
  const password = "Synthetic RentWise browser password";
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error("Test account could not be created");
  const user = data.user.id;
  const clean = async () => {
    if (admin) fixtureAdmin(user, false);
    const deleted = await service.auth.admin.deleteUser(user);
    expect(deleted.error).toBeNull();
  };
  try {
    if (admin) fixtureAdmin(user, true);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/, { timeout: 20000 });
    return { client, clean, user };
  } catch (error) {
    await clean();
    throw error;
  }
}
