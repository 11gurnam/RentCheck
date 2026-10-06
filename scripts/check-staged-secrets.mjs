import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
const sensitiveNames = [
  "SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET",
  "SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID",
  "SUPABASE_TEST_SERVICE_ROLE_KEY",
];
const secrets = [".env.google.local", ".env.test.local"]
  .filter(existsSync)
  .flatMap((file) => {
    const env = parseEnv(readFileSync(file, "utf8"));
    return sensitiveNames.map((name) => env[name]).filter(Boolean);
  });
const files = execFileSync("git", ["diff", "--cached", "--name-only", "-z"])
  .toString()
  .split("\0")
  .filter(Boolean);
for (const file of files) {
  if (
    (file.startsWith(".env") && file !== ".env.example") ||
    file.startsWith("work/")
  )
    throw new Error("Private configuration or generated working files staged.");
  const bytes = execFileSync("git", ["show", `:${file}`], {
    maxBuffer: 10 * 1024 * 1024,
  });
  if (secrets.some((secret) => bytes.includes(Buffer.from(secret))))
    throw new Error("Private configuration value found in staged content.");
}
console.log(
  `PASS: ${files.length} staged files scanned; private configuration absent.`,
);
