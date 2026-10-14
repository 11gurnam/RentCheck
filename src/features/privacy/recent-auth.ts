// Call only with claims verified by Supabase auth.getClaims(), alongside auth.getUser().
export function recentAuthentication(claims: unknown, now = Date.now() / 1000) {
  if (
    !claims ||
    typeof claims !== "object" ||
    !("amr" in claims) ||
    !Array.isArray(claims.amr)
  )
    return false;
  return claims.amr.some((entry: unknown) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("method" in entry) ||
      !("timestamp" in entry)
    )
      return false;
    return (
      ["password", "oauth", "recovery", "otp", "totp"].includes(
        String(entry.method),
      ) &&
      typeof entry.timestamp === "number" &&
      entry.timestamp <= now + 30 &&
      now - entry.timestamp <= 600
    );
  });
}
