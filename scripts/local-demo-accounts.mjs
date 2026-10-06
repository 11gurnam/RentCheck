import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { execFileSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import sharp from "sharp";
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error("Isolated local backend required");
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
mkdirSync("work", { recursive: true });
const file = "work/demo-accounts.json";
let accounts = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
for (const role of ["admin", "renter", "renter2", "renter3", "claimant"]) {
  if (accounts.some((a) => a.role === role)) continue;
  const email =
    "demo-" + role + "-" + randomUUID().slice(0, 8) + "@example.test";
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { public_alias: "Demo " + role },
  });
  if (error) throw new Error("Demo account creation failed");
  accounts.push({ role, email, password, id: data.user.id });
}
writeFileSync(file, JSON.stringify(accounts, null, 2));
const admin = accounts.find((a) => a.role === "admin");
if (
  !admin ||
  !/^[-0-9a-f]{36}$/.test(admin.id) ||
  !admin.email.endsWith("@example.test")
)
  throw new Error("Unsafe local administrator fixture");
execFileSync(
  "docker",
  [
    "exec",
    "supabase_db_rentcheck-accounts-test",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `insert into private.administrator_grants(user_id,reason) select id,'Synthetic local walkthrough administrator' from auth.users where id='${admin.id}' and email like '%@example.test' on conflict(user_id) do nothing;`,
  ],
  { stdio: "pipe" },
);
const output = process.argv[2];
if (!output) throw new Error("Supply a local outputs folder");
mkdirSync(output, { recursive: true });
const lines = [
  "# Local demonstration accounts",
  "Only for RentCheck on this computer. Your Google account remains an ordinary account.",
  "Open http://127.0.0.1:3000/sign-in and use one of these email/password pairs.",
  "",
];
for (const a of accounts)
  lines.push(
    "## " + a.role,
    "Email: " + a.email,
    "Password: " + a.password,
    "",
  );
writeFileSync(output + "/local-demo-accounts.md", lines.join("\n"));
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="#f6f2e7"/><g fill="#173d32" font-family="Arial" font-size="34"><text x="60" y="100">RENTCHECK — FICTIONAL DOCUMENT</text><text x="60" y="190">Tenant: Example Tenant</text><text x="60" y="260">Address: Invented Demo Lane, India</text><text x="60" y="330">Tenancy start: 2025-01-01</text><text x="60" y="400">Monthly rent: INR 1500</text><text x="60" y="510">SYNTHETIC TEST DATA ONLY</text><text x="60" y="570">Not a real contract or proof of tenancy.</text></g></svg>';
await sharp(Buffer.from(svg))
  .png()
  .toFile(output + "/fictional-rental-document.png");
console.log(
  "Local demonstration accounts and fictional document ready in the requested folder. Credentials were not printed.",
);
