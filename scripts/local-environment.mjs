import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

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
writeFileSync(
  ".env.test.local",
  `SUPABASE_TEST_URL=${backend}\nSUPABASE_TEST_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY ?? status.ANON_KEY}\nSUPABASE_TEST_SERVICE_ROLE_KEY=${status.SECRET_KEY ?? status.SERVICE_ROLE_KEY}\n`,
);
console.log(
  "Local account configuration ready. Existing .env.local was preserved; test keys stayed in ignored files.",
);
