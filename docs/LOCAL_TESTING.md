# Automatic local testing session

This extracted copy supports opt-in `LOCAL_AUTO_SIGN_IN=true` with a dedicated Supabase test account. The account's random password and email are stored only in `.env.local` as `LOCAL_TEST_EMAIL` and `LOCAL_TEST_PASSWORD`. Do not share that file or include it in a ZIP.

Opening a protected API route on the configured loopback origin automatically signs in this account and stores an HttpOnly session cookie. Normal Supabase authentication, ownership policies, account checks, quotas, CSRF and provider budget gates still apply. Existing signed-in users are preserved.

The option defaults off. It rejects non-loopback APP_URLs, mismatched request hosts, remote forwarded requests and Vercel deployments. Do not expose the local server through a tunnel or reverse proxy; bind it to 127.0.0.1 as the existing npm scripts do. Any person using this local instance shares its test account.

Run `npm run build` followed by `npm start`; APP_URL must match the browser origin exactly. A production build is used locally because the strict CSP conflicts with development debugging tools. Local test credentials are never bundled into browser code.

The configured Supabase project URL must be its origin, without `/rest/v1/` or `/auth/v1/`. The SDK adds those paths itself.

Sign out clears the session, but local auto sign-in will create another session on the next protected request. Set LOCAL_AUTO_SIGN_IN=false and restart to disable this behavior. Deleting the test account in Settings requires provisioning a replacement before using automatic sign-in again.

This option does not enable paid providers: PROVIDER_BUDGET_CONFIRMED and GLOBAL_KILL_SWITCH retain their existing behavior. No research data is fabricated.
