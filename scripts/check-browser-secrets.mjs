import { readFileSync, readdirSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { join } from "node:path";
const env = parseEnv(readFileSync(".env.local", "utf8"));
const secrets = [env.SUPABASE_SERVICE_ROLE_KEY].filter(Boolean);
if (existsSync(".env.google.local"))
  secrets.push(
    parseEnv(readFileSync(".env.google.local", "utf8"))
      .SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET,
  );
if (existsSync("work/demo-accounts.json"))
  secrets.push(
    ...JSON.parse(readFileSync("work/demo-accounts.json", "utf8")).map(
      (a) => a.password,
    ),
  );
let count = 0;
function scan(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) scan(path);
    else {
      count++;
      const bytes = readFileSync(path);
      if (secrets.filter(Boolean).some((s) => bytes.includes(Buffer.from(s))))
        throw new Error("Private value found in browser assets");
    }
  }
}
scan(".next/static");
console.log(
  `PASS: ${count} browser assets contain no configured private values.`,
);
