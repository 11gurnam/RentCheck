import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { localBackendConfiguration } from "../helpers/local-backend";
import { cleanupReviewUser } from "../helpers/review-cleanup";
import { fixtureAdmin } from "../helpers/admin-fixture";
const c = localBackendConfiguration();
if (!c) throw new Error("Local backend required");
test("real recovery email changes password and a consumed token cannot be reused", async ({
  page,
  request,
}, info) => {
  test.setTimeout(90000);
  const service = createClient(c.url, c.serviceKey, {
      auth: { persistSession: false },
    }),
    client = createClient(c.url, c.publicKey, {
      auth: { persistSession: false },
    });
  const email = "recovery-browser-" + crypto.randomUUID() + "@example.test",
    oldPassword = "Synthetic recovery old password",
    newPassword = "Synthetic recovery new password";
  const u = await service.auth.admin.createUser({
    email,
    password: oldPassword,
    email_confirm: true,
  });
  expect(u.error).toBeNull();
  try {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send recovery email" }).click();
    await expect(page.getByRole("status")).toContainText(
      "If that address has an account",
    );
    let messageId: string | undefined;
    await expect
      .poll(async () => {
        const list = await (
          await request.get(
            "http://127.0.0.1:54324/api/v1/search?query=" +
              encodeURIComponent("to:" + email),
          )
        ).json();
        messageId = list.messages?.[0]?.ID;
        return !!messageId;
      })
      .toBe(true);
    const mail = await (
      await request.get("http://127.0.0.1:54324/api/v1/message/" + messageId)
    ).json();
    const link = String(mail.HTML)
      .match(/href="([^"]+\/auth\/confirm[^"]+)"/)?.[1]
      ?.replaceAll("&amp;", "&");
    expect(link).toBeTruthy();
    expect(link).toContain("type=recovery");
    await page.goto(link!);
    await expect(page).toHaveURL(/\/account\/password$/);
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByRole("status")).toContainText("Password updated");
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
      path: info.outputPath("password-recovery.png"),
      fullPage: true,
    });
    expect(
      (await client.auth.signInWithPassword({ email, password: oldPassword }))
        .error,
    ).not.toBeNull();
    expect(
      (await client.auth.signInWithPassword({ email, password: newPassword }))
        .error,
    ).toBeNull();
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in\?notice=signed-out$/);
    await page.goto(link!);
    await expect(page).toHaveURL(/\/sign-in\?notice=auth-error$/);
    await page.goto("/account/password");
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  } finally {
    expect(
      (await service.auth.admin.deleteUser(u.data.user!.id)).error,
    ).toBeNull();
  }
});
test("private PDFs, decision notifications and account deletion remove actual registered media", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(150000);
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const users: {
    id: string;
    email: string;
    client: typeof service;
  }[] = [];
  const password = "Synthetic privacy browser password";
  let property: string | undefined;
  let closed = false;
  let landlordClosed = false;
  const paths: { bucket: string; path: string }[] = [];
  const otherContext = await browser.newContext();
  try {
    for (let n = 0; n < 2; n++) {
      const email = "privacy-browser-" + crypto.randomUUID() + "@example.test";
      const u = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(u.error).toBeNull();
      const client = createClient(c.url, c.publicKey, {
        auth: { persistSession: false },
      });
      expect(
        (await client.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      users.push({ id: u.data.user!.id, email, client });
    }
    const p = await users[1].client.rpc("create_property", {
      p_input: {
        name: "Synthetic privacy fixture " + crypto.randomUUID(),
        address: "Synthetic privacy lane " + crypto.randomUUID(),
        state: "Delhi",
        city: "Privacy fixture city",
        locality: "Fixture area",
        type: "Flat",
        min: 1000,
        max: 2000,
        synthetic: true,
      },
    });
    expect(p.error).toBeNull();
    property = p.data;
    const r = await users[0].client.rpc("create_review", {
      p_input: {
        property,
        start: "2025-01-01",
        current: true,
        paid: 1000,
        propertyRating: 4,
        body: "Synthetic private document review fixture",
        synthetic: true,
      },
    });
    expect(r.error).toBeNull();
    const review = r.data.id;
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(users[0].email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/reviews/" + review + "/edit");
    const pdf = await PDFDocument.create();
    pdf.addPage().drawText("Fictional agreement for tests only");
    pdf.setAuthor("Private fixture author");
    const pdfBytes = Buffer.from(await pdf.save());
    const script = await PDFDocument.create();
    script.addPage();
    script.addJavaScript("bad", "app.alert('fictional')");
    await page.getByLabel("Fictional rental document image").setInputFiles({
      name: "active.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await script.save()),
    });
    await page.getByLabel("This document contains").check();
    await page
      .getByRole("button", { name: "Request demonstration verification" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "without encryption, scripts",
    );
    await page.getByLabel("Fictional rental document image").setInputFiles({
      name: "fictional.pdf",
      mimeType: "application/pdf",
      buffer: pdfBytes,
    });
    await page
      .getByRole("button", { name: "Request demonstration verification" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "verification requested",
    );
    const verification = (await users[0].client.rpc("get_my_verifications"))
      .data[0];
    const url = "/api/documents/" + verification.document_id;
    paths.push({
      bucket: "rental-documents",
      path: "verification/" + verification.document_id + ".pdf",
    });
    const download = await page.request.get(url);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-type"]).toBe("application/pdf");
    expect(download.headers()["content-security-policy"]).toContain("sandbox");
    const normalized = await PDFDocument.load(await download.body());
    expect(normalized.getAuthor()).toBe("");
    expect(normalized.getPageCount()).toBe(1);
    expect(
      (await otherContext.request.get("http://127.0.0.1:3000" + url)).status(),
    ).toBe(401);
    const otherPage = await otherContext.newPage();
    await otherPage.goto("http://127.0.0.1:3000/sign-in");
    await otherPage.getByLabel("Email address").fill(users[1].email);
    await otherPage.getByLabel("Password", { exact: true }).fill(password);
    await otherPage
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(otherPage).toHaveURL(/\/account$/);
    expect(
      (await otherContext.request.get("http://127.0.0.1:3000" + url)).status(),
    ).toBe(404);
    await otherPage.goto(
      "http://127.0.0.1:3000/claims/new?kind=property&target=" + property,
    );
    await otherPage
      .getByLabel("Fictional claim evidence image")
      .setInputFiles({
        name: "fictional-claim.pdf",
        mimeType: "application/pdf",
        buffer: pdfBytes,
      });
    await otherPage.getByLabel("This claim and").check();
    await otherPage
      .getByRole("button", { name: "Submit demonstration claim" })
      .click();
    await expect(otherPage.getByRole("status")).toContainText(
      "claim submitted",
    );
    const claim = (await users[1].client.rpc("get_my_claims")).data[0];
    const claimPath = "claim/" + claim.document_id + ".pdf";
    paths.push({ bucket: "rental-documents", path: claimPath });
    expect(
      (
        await otherContext.request.get(
          "http://127.0.0.1:3000/api/documents/" + claim.document_id,
        )
      ).headers()["content-type"],
    ).toBe("application/pdf");
    fixtureAdmin(users[1].id, true);
    expect(
      (
        await users[1].client.rpc("decide_claim", {
          p_claim: claim.id,
          p_decision: "approved",
          p_reason: "Synthetic private PDF claim approval",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await users[1].client.rpc("decide_verification", {
          p_request: verification.id,
          p_decision: "approved",
          p_reason: "Synthetic private document approval",
        })
      ).error,
    ).toBeNull();
    fixtureAdmin(users[1].id, false);
    await page.goto("/account/notifications");
    await expect(page.getByRole("main")).toContainText(
      "Your tenancy verification is now approved",
    );
    await page.getByRole("button", { name: "Mark as read" }).click();
    await expect(page.getByRole("button", { name: "Mark as read" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("main")).not.toContainText("Unread");
    await page.screenshot({
      path: info.outputPath("private-notifications.png"),
      fullPage: true,
    });
    const photo = crypto.randomUUID(),
      photoPath = review + "/" + photo + ".jpg";
    const jpeg = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "green" },
    })
      .jpeg()
      .toBuffer();
    paths.push({ bucket: "review-photos", path: photoPath });
    expect(
      (
        await service.storage
          .from("review-photos")
          .upload(photoPath, jpeg, { contentType: "image/jpeg" })
      ).error,
    ).toBeNull();
    expect(
      (
        await service.rpc("register_review_photo", {
          p_user: users[0].id,
          p_review: review,
          p_photo: photo,
        })
      ).error,
    ).toBeNull();
    expect((await page.request.get("/api/photos/" + photo)).status()).toBe(200);
    await page.goto("/account/privacy");
    await page.getByLabel("Deletion confirmation").fill("KEEP");
    await page.getByLabel("I understand this is permanent").check();
    await page
      .getByRole("button", { name: "Delete my account permanently" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Type DELETE MY ACCOUNT",
    );
    expect(
      (await service.auth.admin.getUserById(users[0].id)).data.user?.id,
    ).toBe(users[0].id);
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
      path: info.outputPath("account-deletion-confirmation.png"),
      fullPage: true,
    });
    await page.getByLabel("Deletion confirmation").fill("DELETE MY ACCOUNT");
    await page
      .getByRole("button", { name: "Delete my account permanently" })
      .click();
    await expect(page).toHaveURL(/\/sign-in\?notice=account-deleted$/);
    closed = true;
    expect(
      (await service.auth.admin.getUserById(users[0].id)).data.user,
    ).toBeNull();
    expect((await page.request.get("/api/photos/" + photo)).status()).toBe(404);
    expect((await page.request.get(url)).status()).toBe(401);
    expect(
      (await service.storage.from("review-photos").download(photoPath)).error,
    ).not.toBeNull();
    expect(
      (await service.storage.from("rental-documents").download(paths[0].path))
        .error,
    ).not.toBeNull();
    expect(
      (await service.rpc("get_media_purge_jobs", { p_user: users[0].id })).data,
    ).toHaveLength(0);
    expect(
      (await service.storage.from("rental-documents").download(claimPath))
        .error,
    ).toBeNull();
    const landlordPhoto = crypto.randomUUID(),
      landlordPath = "property/" + property + "/" + landlordPhoto + ".jpg";
    paths.push({ bucket: "review-photos", path: landlordPath });
    expect(
      (
        await service.storage
          .from("review-photos")
          .upload(landlordPath, jpeg, { contentType: "image/jpeg" })
      ).error,
    ).toBeNull();
    expect(
      (
        await service.rpc("register_property_photo", {
          p_user: users[1].id,
          p_property: property,
          p_photo: landlordPhoto,
        })
      ).error,
    ).toBeNull();
    await otherPage.goto("http://127.0.0.1:3000/account/privacy");
    await otherPage
      .getByLabel("Deletion confirmation")
      .fill("DELETE MY ACCOUNT");
    await otherPage.getByLabel("I understand this is permanent").check();
    await otherPage
      .getByRole("button", { name: "Delete my account permanently" })
      .click();
    await expect(otherPage).toHaveURL(/\/sign-in\?notice=account-deleted$/);
    landlordClosed = true;
    expect(
      (await service.storage.from("rental-documents").download(claimPath))
        .error,
    ).not.toBeNull();
    expect(
      (await service.storage.from("review-photos").download(landlordPath))
        .error,
    ).not.toBeNull();
    expect(
      (await service.rpc("get_property_photos", { p_property: property })).data,
    ).toHaveLength(0);
    expect(
      (
        await service
          .from("properties")
          .select("id")
          .eq("id", property)
          .single()
      ).error,
    ).toBeNull();
  } finally {
    await otherContext.close();
    for (const x of paths)
      await service.storage.from(x.bucket).remove([x.path]);
    for (let n = 0; n < users.length; n++) {
      if (n === 0 && closed) continue;
      if (n === 1 && landlordClosed) continue;
      fixtureAdmin(users[n].id, false);
      cleanupReviewUser(users[n].id);
      expect(
        (await service.auth.admin.deleteUser(users[n].id)).error,
      ).toBeNull();
    }
    if (property)
      expect(
        (await service.from("properties").delete().eq("id", property)).error,
      ).toBeNull();
  }
});
