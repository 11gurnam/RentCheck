import { describe, expect, it } from "vitest";
import { parsePublicEnvironment } from "./environment";

describe("public backend configuration", () => {
  it.each([
    "sb_secret_synthetic",
    `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`,
  ])("rejects a privileged key %s", (key) => {
    expect(() =>
      parsePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toThrow();
  });
  it("accepts a URL and publishable key without including privileged variables", () => {
    expect(
      parsePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "demo-public",
        SUPABASE_SECRET_KEY: "synthetic-private",
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "demo-public",
    });
  });
  it.each([
    {},
    {
      NEXT_PUBLIC_SUPABASE_URL: "invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "demo",
    },
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "  ",
    },
  ])("rejects missing or invalid configuration: %j", (input) => {
    expect(() => parsePublicEnvironment(input)).toThrow();
  });
});
