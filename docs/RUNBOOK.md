# Runbook

## Local preview (no credentials)

Use Node.js 24 and npm. From the repository:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3000. This is setup mode: screens work, protected operations explain unavailable configuration, and no fabricated prospects appear. Keep `npm start` separate from builds; rebuilding replaces `.next` and invalidates a running production server. Strict CSP intentionally disallows development tooling that needs unsafe-eval, so use build/start for browser verification.

## Environment matrix

Copy `.env.example` to `.env.local` only for local use. Never commit credentials. Set each Vercel environment separately; Preview must use isolated test infrastructure and budgets, never production data. None of these keys uses `NEXT_PUBLIC_`.

| Variables                                                               | Meaning / requirement                                                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `SPECTRA_MODE`                                                          | `setup` by default; `live` enforces infrastructure validation                                                                            |
| `APP_URL`                                                               | Exact origin, including scheme; localhost for development, exact preview/production origin for deployed CSRF and callbacks               |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Required in live mode; dedicated project and least-privilege operator access                                                             |
| `CRON_SECRET`                                                           | Random 32+ characters; required live; Vercel sends it as bearer authorization                                                            |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                    | Required live; rate limits fail closed when unavailable                                                                                  |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                            | Required live; register exact domain(s); signup verification checks hostname                                                             |
| `GNANI_API_KEY`, `GNANI_VOICE_ID`                                       | Prisma/Timbre access; voice defaults to documented `Kaveri`; confirm account access and credits                                          |
| `REASONING_PROVIDER`                                                    | `evon` default or explicitly approved `fallback`                                                                                         |
| `EVON_ACCESS_CONFIRMED`, `EVON_CREDITS_CONFIRMED`                       | Defaults false; flags alone do not implement an API. Evon remains unavailable until its official contract is supplied and adapter tested |
| `FALLBACK_APPROVED`                                                     | Must be `true` only after owner approval                                                                                                 |
| `FALLBACK_BASE_URL`, `FALLBACK_API_KEY`, `FALLBACK_MODEL`               | Required for approved OpenAI-compatible fallback; choose a provider/model supporting structured JSON                                     |
| `TAVILY_API_KEY`                                                        | Required for actual discovery; no search-engine HTML scraping                                                                            |
| `PROVIDER_BUDGET_CONFIRMED`                                             | Explicit owner confirmation of provider account limits; all consumption paused unless true                                               |
| `GLOBAL_KILL_SWITCH`                                                    | `true` stops charged provider operations globally                                                                                        |

Do not add placeholder secrets to hosted environments. Configure actual values in the provider/platform secret UI. Check separate provider-side spend caps; call counters cannot guarantee a currency budget.

## Supabase setup

Local database checks require Docker running:

```sh
npx supabase start
npx supabase test db
```

The CLI may print local credentials: keep that output private. Migrations run on local start. `supabase db reset` is destructive and is unnecessary for ordinary checks. Optional dev-only account seed: load local Supabase values into your shell, set `SPECTRA_SEED_DEV=true` and a unique `SPECTRA_SEED_PASSWORD` of at least 12 characters, then run `node scripts/seed-dev.mjs`. It refuses non-local hosts and creates only `spectra@example.test`, never fake prospects. Unset the seed password afterward.

For a new hosted project, choose region and backup policy, sign in to the CLI, then:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Review the migration plan before applying it to an existing database. This app expects its own schema. Configure email confirmation, production SMTP, a five-minute JWT expiry, refresh rotation and TOTP. Set Site URL to `APP_URL`; allow `/auth/callback` on the exact approved origins. Enable Google OAuth using credentials owned by the operator and register the Supabase callback URL with Google. Copy `supabase/templates/confirmation.html` into the hosted confirmation template after branding review. `config.toml` describes local Auth settings; it does not automatically configure all hosted dashboard settings.

No Storage bucket is needed: original uploads/audio are discarded. If retention is added later, require explicit consent, a private bucket, owner policies, signed downloads and a separate content origin before enabling it.

## CI and deploy checklist

1. Push the repository; ensure Actions permissions allow the quality, Gitleaks and CodeQL workflows. Private-repository CodeQL can require GitHub Code Security entitlement. Do not hide a failed security job or deploy while required CI is red.
2. Run `npm run check`, `npm run test:e2e`, `npx vitest run --coverage`, `npx supabase test db`, `node scripts/secret-scan.mjs`, and `npm audit --audit-level=high`. CI installs Chromium; local Windows tests use Edge.
3. Create a Vercel Next.js project after CI is green. Use Node 24, repository root, `npm ci`, `npm run build`; retain deployment protection during acceptance. Confirm plan eligibility: Hobby is for personal/non-commercial use.
4. Configure isolated Preview infrastructure and actual environment values. A setup-mode deployment is only a UI preview. It cannot perform real research.
5. Apply migrations and hosted Auth settings, confirm provider approvals and budgets, then set live mode. Set the exact deployed origin and allowed callbacks/Turnstile hosts.
6. Deploy and test real signup/verification, Google login, TOTP, logout/refresh, two-user isolation, text and voice offer confirmation, one low-cost research batch, source verification, CSV, export and deletion. Check the PDF worker on the deployed runtime.
7. Confirm cron authorization, lease recovery, quota pause and kill switches. `vercel.json` runs one daily tick at 05:00 UTC, compatible with [Hobby scheduling limits](https://vercel.com/docs/cron-jobs/usage-and-pricing). It cannot finish a multi-item batch promptly without an open browser. Production unattended research needs a supported frequent cron schedule (for example every minute on an eligible plan), reviewed cost limits and a new deployment.
8. Review privacy/terms, subprocessors, retention and lawful outreach policy. Add operator identity/contact before removing deployment protection. Confirm domain, TLS, HSTS suitability for all subdomains, provider monitoring and backup restoration.

No custom domain has been selected. No paid upgrade is assumed or authorized by this checklist.

## Operation and recovery

Daily per-user caps: 5 research batches, 25 search calls, 100 page/robots fetches, 60 reasoning calls, 300 STT seconds, 6,000 TTS characters. Global daily caps are ten times these. All attempts reserve usage before the provider call; failure does not refund a reservation. A large batch may exhaust page quota and pause rather than exceed it. User-facing usage reflects these units, not provider credits.

Research view drives one leased item at a time and polls progress. Resume the search from History after closing the tab. Retry failed items through the UI; do not edit lease tokens manually. Confirm quota/credential issues first. A crashed worker's lease expires after 90 seconds. Source cache is valid for seven days; scheduled maintenance removes expired rows. Saved records remain until account deletion; no automatic pruning of audit, usage or shortlist records is promised.

Block an abusive account by inserting a server-managed audit event `account.blocked` for that user; `account.unblocked` reverses it. Use the database administrator UI with the exact verified UUID and record the reason without sensitive text. The latest event governs access. Do not delete block events as routine retention. Global emergency provider stop uses `GLOBAL_KILL_SWITCH=true` plus redeploy. Configure Vercel Firewall challenge/rate rules on auth and APIs using the available plan controls; observe legitimate Turnstile and voice traffic before tightening.

Log request ID, provider/model, usage units and stage failures. Never log raw audio, account exports, bearer tokens or documents. Inspect provider dashboards for budget drift. If Redis fails, restore it rather than bypass rate checks. Rotate secrets in the platform and provider, redeploy, invalidate sessions as needed, and follow `SECURITY.md` for incidents.
