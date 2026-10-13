import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

const env = parseEnv(readFileSync(".env.hosted.local", "utf8"));
const origin = "https://rentcheck-india.netlify.app";
if (env.NEXT_PUBLIC_SUPABASE_URL !== "https://qbvuwjyamktzwimisvet.supabase.co" || env.SITE_URL.replace(/\/$/, "") !== origin)
  throw new Error("Unexpected hosted release target");
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) } };
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const requireData = result => { if (result.error) throw new Error("Hosted database check failed"); return result.data; };
const properties = requireData(await anon.from("properties").select("id,is_demo,city").eq("status", "published"));
if (properties.filter(p => p.is_demo).length < 8) throw new Error("Demo catalogue missing");
const mode = requireData(await anon.rpc("get_operation_mode"));
if (mode.accepts_real_data || !mode.allows_demo_data) throw new Error("Unexpected operation mode");
requireData(await anon.from("public_profiles").select("id,public_alias,avatar_url").limit(1));
if ((await anon.from("public_profiles").select("avatar_object").limit(1)).error?.code !== "42501") throw new Error("Avatar storage paths became public");
requireData(await anon.from("property_criterion_scores").select("property_id,criterion_key,rating").limit(1));
requireData(await anon.rpc("get_review_avatars", { p_reviews: [] }));
requireData(await anon.rpc("get_property_gallery", { p_property: properties[0].id }));
const buckets = requireData(await service.storage.listBuckets());
for (const name of ["review-photos", "rental-documents", "profile-photos"]) {
  const bucket = buckets.find(b => b.name === name);
  if (!bucket || bucket.public || Number(bucket.file_size_limit) !== 5242880) throw new Error("Private storage configuration differs");
}
const oauth = requireData(await anon.auth.signInWithOAuth({ provider: "google", options: { redirectTo: origin + "/auth/callback?next=/account", skipBrowserRedirect: true } }));
const handoff = await fetch(oauth.url, { redirect: "manual", signal: AbortSignal.timeout(20000) });
const google = new URL(handoff.headers.get("location") || origin);
if (handoff.status !== 302 || google.hostname !== "accounts.google.com" || google.searchParams.get("redirect_uri") !== env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/callback")
  throw new Error("Hosted Google provider handoff failed");
const checks = [
  ["/", 200], ["/search", 200], ["/compare", 200], ["/sign-in", 200], ["/privacy", 200], ["/api/health", 200],
  [`/properties/${properties[0].id}`, 200], ["/api/account", 401], ["/api/admin/access", 401],
  ["/.env.hosted.local", 404], ["/server/app/api/health/route.js", 404],
];
for (const [path, status] of checks) {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(30000) });
  if (response.status !== status) throw new Error(`Hosted HTTP check failed: ${path}`);
  const html = await response.text();
  if (path === "/compare" && !html.includes("compare-dropdown-trigger")) throw new Error("Comparison release not visible");
  if (path === "/sign-in" && !html.includes("Continue with Google")) throw new Error("Google option missing");
  if (path === "/search" && !html.includes("accommodation-result-count")) throw new Error("Search release not visible");
}
console.log(JSON.stringify({ httpChecks: checks.length, databaseChecks: "passed", privateBuckets: 3, publicCatalogueCount: properties.length, realIntakeClosed: true, googleOptionVisible: true, googleProviderHandoff: true, newComparisonVisible: true }));
