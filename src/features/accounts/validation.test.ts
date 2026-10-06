import { describe, expect, it } from "vitest";
import {
  aliasSchema,
  registerSchema,
  safeDestination,
  signInSchema,
} from "./validation";

describe("account input validation", () => {
  const valid = {
    email: " TENANT@example.test ",
    password: "Long test passphrase 10",
    confirmPassword: "Long test passphrase 10",
    alias: " QuietTenant ",
  };
  it("normalizes email and alias without modifying a password", () => {
    expect(registerSchema.parse(valid)).toEqual({
      ...valid,
      email: "tenant@example.test",
      alias: "QuietTenant",
    });
  });
  it.each([
    "",
    "ab",
    "a".repeat(41),
    "tenant@example.test",
    "<script>",
    "tenant\nname",
  ])("rejects invalid alias %j", (alias) => {
    expect(aliasSchema.safeParse(alias).success).toBe(false);
  });
  it.each(["abc", "a".repeat(40), "किरायेदार"])(
    "accepts valid aliases including Indian scripts %j",
    (alias) => {
      expect(aliasSchema.safeParse(alias).success).toBe(true);
    },
  );
  it.each(["short", "a".repeat(129)])(
    "rejects registration password boundary %j",
    (password) => {
      expect(
        registerSchema.safeParse({
          ...valid,
          password,
          confirmPassword: password,
        }).success,
      ).toBe(false);
    },
  );
  it("accepts exact password length boundaries", () => {
    for (const password of ["a".repeat(10), "a".repeat(128)])
      expect(
        registerSchema.safeParse({
          ...valid,
          password,
          confirmPassword: password,
        }).success,
      ).toBe(true);
  });
  it("rejects mismatched confirmation and invalid email", () => {
    expect(
      registerSchema.safeParse({ ...valid, confirmPassword: "different" })
        .success,
    ).toBe(false);
    expect(
      signInSchema.safeParse({ email: "invalid", password: "password" })
        .success,
    ).toBe(false);
  });
  it("sign-in accepts an existing short password but rejects an empty password", () => {
    expect(
      signInSchema.safeParse({ email: "test@example.test", password: "older" })
        .success,
    ).toBe(true);
    expect(
      signInSchema.safeParse({ email: "test@example.test", password: "" })
        .success,
    ).toBe(false);
  });
  it("ignores injected privilege fields in submitted registration data", () => {
    expect(
      registerSchema.parse({ ...valid, is_administrator: true, role: "admin" }),
    ).not.toHaveProperty("role");
  });
});

describe("post-auth destinations", () => {
  it.each(["/account", "/reviews/new", "/admin", "/saved", "/properties/new", "/properties/20000000-0000-4000-8000-000000000001"])(
    "preserves allowed path %s",
    (path) => expect(safeDestination(path)).toBe(path),
  );
  it.each([
    undefined,
    null,
    "https://evil.example",
    "//evil.example",
    "\\evil.example",
    "/account?next=https://evil.example",
    "/%2f%2fevil.example",
    "/account/../../evil",
  ])("rejects unsafe path %j", (path) =>
    expect(safeDestination(path)).toBe("/account"),
  );
});
