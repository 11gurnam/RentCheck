# Google sign-in setup: steps that need your account

The local email/password backend can run entirely on this computer. Google sign-in additionally needs an OAuth client owned by you. That client tells Google which application is asking to sign you in. This is configuration, not a deployment.

## Local Google setup (use this when Docker is running)
1. Open [Google Cloud Console](https://console.cloud.google.com/) and sign in yourself. Create a project named **RentCheck test** (or use a suitable existing test project).
2. Open **Google Auth Platform**. Complete the branding/audience setup. Use **External** audience and keep the app in **Testing**. Add your own Google email as a test user. Choose an app name and required contact email; do not add real rental data.
3. Under **Clients**, create an **OAuth client** of type **Web application**. Add JavaScript origins `http://127.0.0.1:3000` and `http://localhost:3000`. Add the authorized redirect URI `http://127.0.0.1:54321/auth/v1/callback`. This redirect goes to local Supabase, which then returns to RentCheck.
4. Google shows a **Client ID** and **Client secret**. Do not paste the secret into chat or GitHub. Tell me the client is ready. I can open an ignored configuration file for you to enter them privately; the file must stay on your computer.
5. I will enable the provider through environment variables, restart the local backend, enable the RentCheck Google action and run checks that do not need Google login. You complete the actual Google account sign-in yourself. Expect your account page, a generated Tenant alias (not your Google name/photo), and no administrator grant.

Reference: [Supabase Google provider guide](https://supabase.com/docs/guides/auth/social-login/auth-google). Console wording can change; if you get stuck, tell me the step and visible wording. I can guide you without handling your password.

## Alternative: hosted test Supabase project
Only use this if the local backend cannot run. Create a separate test project in [Supabase](https://supabase.com/dashboard), not a production project. Project password stays private. Add its Project URL and publishable key to `.env.local`; set SITE_URL to the local website origin. Apply the accounts migration to that test project, configure email confirmations and the supplied confirmation template, set redirect allowlist URLs to the local callback/confirm URLs. Use the project's displayed Supabase callback URL as the Google authorized redirect URI. Enter the Google client secret directly in Supabase's Google provider settings; enable GOOGLE_AUTH_ENABLED only after setup. Do not run the local destructive test/reset commands against a hosted project.

No paid upgrade is required for the local test workflow. Do not create billing/deployment resources for this phase.
