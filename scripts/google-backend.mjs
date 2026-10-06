import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { parseEnv } from "node:util";

const google = parseEnv(readFileSync(".env.google.local", "utf8"));
if (
  !google.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID?.endsWith(
    ".apps.googleusercontent.com",
  ) ||
  !google.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET
)
  throw new Error(
    "Enter the Google client ID and secret in .env.google.local first.",
  );
const application = parseEnv(readFileSync(".env.local", "utf8"));
if (application.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error("This helper only configures the isolated local backend.");
const project = "work/google-backend";
mkdirSync(`${project}/supabase`, { recursive: true });
for (const name of ["migrations", "templates", "seed.sql"])
  cpSync(`supabase/${name}`, `${project}/supabase/${name}`, {
    recursive: true,
  });
const original = readFileSync("supabase/config.toml", "utf8");
if (!original.includes('project_id = "rentcheck-accounts-test"'))
  throw new Error("Unexpected backend project identifier.");
writeFileSync(
  `${project}/supabase/config.toml`,
  original +
    '\n[auth.external.google]\nenabled = true\nclient_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"\nsecret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"\nredirect_uri = "http://127.0.0.1:54321/auth/v1/callback"\n',
);
const options = {
  env: { ...process.env, ...google },
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8",
};
// Stop preserves the dedicated local database volume; no reset, migration push or remote login.
let status;
try {
  execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", "stop"],
    options,
  );
  execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", "start", "--workdir", project],
    options,
  );
  status = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "node_modules/supabase/dist/supabase.js",
        "status",
        "--workdir",
        project,
        "-o",
        "json",
      ],
      options,
    ),
  );
} catch {
  console.error(
    "Google backend setup failed. Credentials were not printed; app configuration is unchanged. Restore the email backend with npm run backend:start if needed.",
  );
  process.exit(1);
}
if (status.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Unexpected backend endpoint.");
let updated = readFileSync(".env.local", "utf8");
for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  GOOGLE_AUTH_ENABLED: "true",
  SUPABASE_SERVICE_ROLE_KEY: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
})) {
  const pattern = new RegExp(`^${name}=.*$`, "m");
  updated = pattern.test(updated)
    ? updated.replace(pattern, `${name}=${value}`)
    : updated + `\n${name}=${value}\n`;
}
writeFileSync(".env.local", updated);
writeFileSync(
  ".env.test.local",
  `SUPABASE_TEST_URL=${status.API_URL}\nSUPABASE_TEST_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY ?? status.ANON_KEY}\nSUPABASE_TEST_SERVICE_ROLE_KEY=${status.SECRET_KEY ?? status.SERVICE_ROLE_KEY}\n`,
);
console.log(
  "Google provider configured locally. Restart the RentCheck preview and verify the Google journey yourself. No provider secret was printed or added to app configuration.",
);

await import("./prepare-storage.mjs");
