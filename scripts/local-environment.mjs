import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const status = JSON.parse(
  execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const backend = status.API_URL;
if (!["127.0.0.1", "localhost"].includes(new URL(backend).hostname))
  throw new Error("Only the isolated local backend is allowed.");
const publicValues = `NEXT_PUBLIC_SUPABASE_URL=${backend}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY ?? status.ANON_KEY}\nSITE_URL=http://127.0.0.1:3000\nGOOGLE_AUTH_ENABLED=false\n`;
if (!existsSync(".env.local")) writeFileSync(".env.local", publicValues);
const app = readFileSync(".env.local", "utf8");
if (parseEnv(app).NEXT_PUBLIC_SUPABASE_URL === backend) {
  const key = `SUPABASE_SERVICE_ROLE_KEY=${status.SECRET_KEY ?? status.SERVICE_ROLE_KEY}`;
  writeFileSync(
    ".env.local",
    /^SUPABASE_SERVICE_ROLE_KEY=.*$/m.test(app)
      ? app.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*$/m, key)
      : app + "\n" + key + "\n",
  );
}
writeFileSync(
  ".env.test.local",
  `SUPABASE_TEST_URL=${backend}\nSUPABASE_TEST_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY ?? status.ANON_KEY}\nSUPABASE_TEST_SERVICE_ROLE_KEY=${status.SECRET_KEY ?? status.SERVICE_ROLE_KEY}\n`,
);
console.log(
  "Local account configuration ready. Existing .env.local was preserved; test keys stayed in ignored files.",
);

await import("./prepare-storage.mjs");
