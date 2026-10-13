import { readFileSync, readdirSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { join } from "node:path";
const privateNames = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET", "SMTP_PASSWORD", "GEMINI_API_KEY"];
const secrets = [
  ...privateNames.map(name => process.env[name]),
  ...[".env.local", ".env.hosted.local", ".env.google.local", ".env.google.hosted.local", ".env.smtp.local"]
    .filter(existsSync).flatMap(file => {
      const env = parseEnv(readFileSync(file, "utf8"));
      return privateNames.map(name => env[name]);
    }),
].filter(Boolean);
secrets.push(...secrets.filter(secret => secret.includes(" ")).map(secret => secret.replaceAll(" ", "")));
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
