export function checkDeploymentEnvironment(env) {
  const problems = [];
  let backend, site;
  try { backend = new URL(env.NEXT_PUBLIC_SUPABASE_URL); } catch { problems.push("NEXT_PUBLIC_SUPABASE_URL must be a hosted HTTPS URL."); }
  try { site = new URL(env.SITE_URL); } catch { problems.push("SITE_URL must be the final HTTPS website origin."); }
  if (backend && (backend.protocol !== "https:" || backend.username || backend.password || !backend.hostname.endsWith(".supabase.co") || backend.pathname !== "/" || backend.search || backend.hash)) problems.push("Use the hosted Supabase project URL, without paths or credentials.");
  if (site && (site.protocol !== "https:" || site.username || site.password || site.hostname === "localhost" || site.hostname === "127.0.0.1" || site.pathname !== "/" || site.search || site.hash)) problems.push("SITE_URL must be a public HTTPS origin without paths or credentials.");
  const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let publicRole;
  if (publicKey?.split(".").length === 3) {
    try { publicRole = JSON.parse(Buffer.from(publicKey.split(".")[1], "base64url")).role; } catch { publicRole = "invalid"; }
  }
  if (!publicKey || (!publicKey.startsWith("sb_publishable_") && publicRole !== "anon")) problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key.");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  let serviceRole;
  if (serviceKey?.split(".").length === 3) {
    try { serviceRole = JSON.parse(Buffer.from(serviceKey.split(".")[1], "base64url")).role; } catch { serviceRole = "invalid"; }
  }
  if (!serviceKey || (!serviceKey.startsWith("sb_secret_") && serviceRole !== "service_role")) problems.push("SUPABASE_SERVICE_ROLE_KEY must be set privately to this project's server credential.");
  if (!["true", "false"].includes(env.GOOGLE_AUTH_ENABLED)) problems.push("GOOGLE_AUTH_ENABLED must explicitly be true or false.");
  if (!env.OPERATOR_NAME?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.OPERATOR_CONTACT_EMAIL ?? "")) problems.push("Set OPERATOR_NAME and OPERATOR_CONTACT_EMAIL for the public privacy notice.");
  return problems;
}
