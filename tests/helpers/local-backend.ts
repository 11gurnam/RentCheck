import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export function localBackendConfiguration() {
  const file = ".env.test.local";
  const input = existsSync(file)
    ? { ...parseEnv(readFileSync(file, "utf8")), ...process.env }
    : process.env;
  if (!input.SUPABASE_TEST_URL) return null;
  const target = new URL(input.SUPABASE_TEST_URL);
  if (
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    target.port !== "54321"
  )
    throw new Error(
      "Integration tests only allow the isolated loopback backend on port 54321.",
    );
  if (
    !input.SUPABASE_TEST_PUBLISHABLE_KEY ||
    !input.SUPABASE_TEST_SERVICE_ROLE_KEY
  )
    throw new Error("Local test configuration is incomplete.");
  return {
    url: target.origin,
    publicKey: input.SUPABASE_TEST_PUBLISHABLE_KEY,
    serviceKey: input.SUPABASE_TEST_SERVICE_ROLE_KEY,
  };
}

export function applicationBackendConfigured() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (existsSync(".env.local")
      ? parseEnv(readFileSync(".env.local", "utf8")).NEXT_PUBLIC_SUPABASE_URL
      : undefined);
  if (url && url !== "http://127.0.0.1:54321")
    throw new Error(
      "Account browser journeys require the isolated local app backend, never a hosted or production project.",
    );
  return !!url;
}
