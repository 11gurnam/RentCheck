// Local provider handoff and simulated denial; this never signs into Google.
const origin = "http://127.0.0.1:3000";
const backend = "http://127.0.0.1:54321";
const authorize = new URL("/auth/v1/authorize", backend);
authorize.searchParams.set("provider", "google");
authorize.searchParams.set("redirect_to", `${origin}/auth/callback?next=%2Faccount`);
const start = await fetch(authorize, { redirect: "manual" });
const google = new URL(start.headers.get("location") ?? "http://invalid");
if (
  start.status !== 302 || google.hostname !== "accounts.google.com" ||
  google.searchParams.get("redirect_uri") !== `${backend}/auth/v1/callback`
) throw new Error("Google handoff failed.");
const state = google.searchParams.get("state");
if (!state) throw new Error("Authorization state missing.");
const cookie = start.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
const callback = new URL("/auth/v1/callback", backend);
callback.searchParams.set("state", state);
callback.searchParams.set("error", "access_denied");
callback.searchParams.set("error_description", "User cancelled sign-in");
const denied = await fetch(callback, { redirect: "manual", headers: { cookie } });
const location = denied.headers.get("location");
if (!location) throw new Error("Provider denial did not return to the app.");
const app = new URL(location);
if (app.origin !== origin || app.pathname !== "/auth/callback")
  throw new Error("Unexpected denial destination.");
const response = await fetch(app, { redirect: "manual" });
const destination = new URL(response.headers.get("location") ?? "http://invalid");
if (destination.origin !== origin || destination.pathname !== "/sign-in" ||
  destination.searchParams.get("notice") !== "auth-error")
  throw new Error("App denial handling failed.");
if (response.headers.getSetCookie().some((value) => value.includes("auth-token=")))
  throw new Error("Denial unexpectedly issued a session cookie.");
console.log("PASS: Google handoff and simulated provider denial with real local authorization state. Actual Google login is checked separately by the user.");
