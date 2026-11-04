# Spectra delivery report

Prepared 4 November 2026. This report distinguishes implementation, local evidence and hosted acceptance. The full production definition of done has not yet been met.

## 1. Built

Next.js/TypeScript app with a distinctive responsive cream/green interface and dark theme; voice, text and document intake; editable confirmed offer profiles; leased database research jobs; public-source crawling and verification; ranked prospects and contact evidence; stable contextual discussion, filtering, history, shortlist, outcome notes and CSV; account export/deletion, MFA configuration, quotas, audit events and emergency controls. All 16 application tables have RLS. The source includes migrations, local database tests, CI, deployment configuration and operational/security documentation.

Public source repository: https://github.com/SurenDotCode/spectra (visibility explicitly authorized by the owner for free CodeQL). Vercel project `spectra` is configured on the existing team, Node 24, with setup mode and provider consumption disabled. The owner-approved free Supabase project `oajplaxdwqkhpisanaxh` is provisioned in Mumbai with all three migrations applied. All 16 tables have forced RLS; all four privileged RPCs deny anonymous/authenticated execution. Supabase security advisor returned no findings. Vercel has the project URL, publishable key and a generated encrypted cron secret; the service-role, Redis, Turnstile and provider credentials remain missing. Deployment acceptance is separate from this configuration and is tracked in Actions and the final delivery message.

## 2. Evidence

- Typecheck, ESLint and production build pass locally.
- 66 unit/integration tests; six browser tests, including axe, stored-XSS, CSV, quota stop and editable voice transcript; 86 actual local Supabase pgTAP checks pass.
- Security-module line coverage 93.33%, crawler 95.18%; selected critical-module total 89.61% lines / 81.63% branches. This is not whole-app coverage.
- Runtime dependency audit: zero vulnerabilities. Full dependency audit: 20 moderate development-tool findings; no high/critical findings; high-severity gate passes. Major-version force fixes were not applied blindly.
- Tracked-file secret-pattern scan passes. The hosted quality job, including Gitleaks, passed on commit `46b67f9`. CodeQL reporting was initially blocked by disabled private-repository code scanning; the owner approved public visibility and the job was rerun. See [the Actions run](https://github.com/SurenDotCode/spectra/actions/runs/41779684925) for its status.
- Lighthouse: 96 performance, 100 accessibility, 100 best practices, 100 SEO; zero layout shift. Measured locally on the setup landing page, not authenticated research performance; see `docs/LIGHTHOUSE.json`.

Browser offer/research/STT success paths use clearly test-only fixtures. Real signup, OAuth/TOTP, live provider calls and real five-business research have not been validated. No A+ hosted header grade or independent penetration test is claimed.

## 3. Needs owner input

Supply securely, not in source control:

- Infrastructure still needed: `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `CRON_SECRET` are already configured in Vercel; use separate infrastructure/values when creating isolated test environments.
- Voice/search: `GNANI_API_KEY`, optional `GNANI_VOICE_ID`, `TAVILY_API_KEY`; confirm actual access and credit balances.
- Evon: official endpoint/auth/model contract and confirmation of access/credit eligibility. `EVON_ACCESS_CONFIRMED` and `EVON_CREDITS_CONFIRMED` do not make the current stub operational.
- Fallback alternative: explicit approval plus `REASONING_PROVIDER=fallback`, `FALLBACK_APPROVED=true`, `FALLBACK_BASE_URL`, `FALLBACK_API_KEY`, `FALLBACK_MODEL`. No provider was silently substituted.
- Budget: owner dashboard spend limits before `PROVIDER_BUDGET_CONFIRMED=true`; set `GLOBAL_KILL_SWITCH=false` only after acceptance.
- Hosting: exact `APP_URL`, intended custom domain, region, eligible commercial plan and frequent scheduler decision. Set `SPECTRA_MODE=live` after configuration.
- Auth/legal: Google OAuth credentials in Supabase/Google, SMTP and callback configuration, operator identity/privacy contact, policies, processor agreements and retention decisions.

## 4. Residual risks and incomplete requirements

Evon is unimplemented pending its contract. Live provider/auth behavior and deployed PDF worker remain untested. Daily Hobby cron cannot promptly complete unattended multi-item jobs. Conversation supports bounded intents; arbitrary missing-fact questions prompt manual refined research. Outcomes influence future prompt context, not a separate numeric adjustment. No opt-in audio retention, Storage bucket or streaming large-account export is implemented. Complete ASVS L2 verification, multi-browser/screen-reader WCAG 2.2 review, production load tests, external header scan and independent security testing remain. Source quotes prove provenance, not source truth, buying intent, consent or deliverability. Full details are in SECURITY.md.

## 5. Deploy checklist

1. Obtain green quality/security CI; resolve entitlement or workflow failures without skipping gates.
2. Configure a dedicated Supabase project and apply migrations; verify email confirmation, short JWTs, rotation, TOTP, Google callbacks and SMTP.
3. Supply isolated Preview environment values, actual provider access and explicit fallback/budget approvals.
4. Connect the existing Vercel project to the repository and deploy a protected preview. Verify all hosted auth, voice, research, isolation, export and delete flows with real providers.
5. Configure a supported frequent worker schedule, spend caps, monitoring, backups and an operator-approved domain. Review legal policies and run the live security acceptance checklist before public production.

Exact commands and per-environment variables are in RUNBOOK.md. Consult [Actions](https://github.com/SurenDotCode/spectra/actions) and [the Vercel project](https://vercel.com/yerrasuren-2739s-projects/spectra) for the latest CI and deployment state. A setup-mode preview is not a live-provider launch.
