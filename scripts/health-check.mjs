const target = new URL(process.env.SITE_URL ?? "http://127.0.0.1:3000");
if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) throw new Error("Use an HTTP(S) site URL without credentials.");
try {
  const response = await fetch(new URL("/api/health", target), { signal: AbortSignal.timeout(5000), cache: "no-store" });
  const result = await response.json();
  if (!response.ok || result.status !== "ok") throw new Error("Health check failed");
  console.log("PASS: application, database and authentication responded.");
} catch { console.error("FAIL: application readiness unavailable. Inspect private operator logs."); process.exitCode = 1; }
