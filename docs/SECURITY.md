# Security assurance and limits

This is a tested implementation, not a certified ASVS L2 product or an independent penetration test. The mapping below is control-family coverage; a requirement-by-requirement [ASVS 5.0 assessment](https://asvs.owasp.org/) remains a launch task. No A+ external header grade is claimed.

## Verification evidence (2026-11-04)

| Check                                  | Local result                                   | Scope                                                                                                     |
| -------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| TypeScript / ESLint / production build | Passed                                         | Strict types, client/server import restrictions, dangerous HTML ban                                       |
| Vitest                                 | 67 passed, 12 files                            | Pipeline/provider fixtures, quotas, DB isolation, SSRF, CSRF, upload, injection, references, CSV          |
| Supabase pgTAP                         | 86 passed, two files                           | Actual local Supabase; cross-user read/insert/update/delete and grants                                    |
| Playwright                             | 6 passed                                       | Edge/Chromium; mocked offer/research/board/STT; real setup-mode denial and headers; axe scans             |
| Coverage                               | Security lines 93.43%; safe-fetch lines 95.18% | Selected critical-module coverage; not whole-app coverage. Overall selected lines 89.72%, branches 81.63% |
| Runtime npm audit                      | 0 vulnerabilities                              | `npm audit --omit=dev --audit-level=high`                                                                 |
| Secret-pattern scan                    | Passed                                         | Tracked files; supplements CI Gitleaks, not a guarantee                                                   |

Fixtures contain test-only businesses; production does not import them. The browser suite does **not** complete real signup, OAuth, MFA, provider billing or a live prospect search. It must not be described as a live-provider end-to-end pass. CI, Gitleaks and CodeQL results are recorded separately in FINAL_REPORT.md.

Hosted Supabase verification: all three migrations applied to the newly created empty Spectra project; all 16 tables have RLS and FORCE RLS, and all four privileged RPCs are executable only by the service role. Security advisor returned no lints. Performance advisor reported only unused indexes on the empty database; retain them for the intended access patterns and review [unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) after representative traffic. These catalog checks supplement, rather than replace, the 86 local/CI behavioral assertions.

## ASVS L2-oriented control families

| Family                                  | Implemented controls                                                                                                          | Outstanding verification                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Encoding, validation, business logic    | Strict mutation schemas, bounded inputs, escaped JSX, CSV neutralization, offer confirmation, idempotency                     | Exhaustive header/query parsing and full schema strictness audit                    |
| Web frontend, API and services          | Nonce CSP without unsafe directives, HSTS, frame denial, same-origin requests, CSRF and rate limits                           | Hosted header scanner, cross-browser CSP/Turnstile behavior                         |
| File handling                           | Magic/type checks, size cap, PDF worker timeout/memory bound, originals discarded                                             | Hostile parser corpus and production worker bundle smoke test                       |
| Authentication, sessions, authorization | Verified Supabase identity/email, MFA assurance, httpOnly cookies, refresh rotation, logout revocation, RLS and owner filters | Hosted signup/OAuth/TOTP, concurrent logout/refresh and recovery flows              |
| Cryptography and secrets                | HTTPS platform requirement, no custom cryptography, server-only keys, env validation, secret scanning                         | Cloud rotation drill and independent access review                                  |
| Secure communication/configuration      | Public-address crawler, TLS defaults, no cookies forwarded, constrained redirects, pinned package lock                        | TLS/domain configuration and action SHA pinning                                     |
| Data protection/logging                 | Export/delete, source dates, redacted structured errors, security events, cache expiry                                        | Backup erasure/retention contracts, large-account export and audit retention policy |

## OWASP risk coverage

Web Top 10 categories addressed: broken access control (RLS/guards); cryptographic failures (platform TLS and key isolation); injection (parameterized DB API, JSX and schema checks); insecure design (threat model, bounded jobs); misconfiguration (fail-closed env and headers); vulnerable components (lockfile/audit/Dependabot); authentication failures (verified sessions/MFA); integrity failures (source post-checks and CI); logging failures (redacted audit); SSRF (central pinned crawler). These are mappings, not statements that each risk is eliminated.

LLM Top 10 risk mapping: prompt injection (untrusted-data instructions and no side effects); sensitive disclosure (minimized inputs, no secrets in prompts); supply chain (explicit providers and pinned packages); data/model poisoning (dated sources and unknown labels); improper output handling (Zod, escaping, URL/contact checks); excessive agency (no tool-driven actions); system-prompt leakage (prompts contain no credentials); vector/embedding weaknesses (no vector store); misinformation (verified/inferred/unknown separation and no demand claims); unbounded consumption (atomic quotas, retries and owner spend caps). Textual evidence can still be false or misleading; the model's extraction accuracy and attack resistance need real-provider evaluation.

## Residual risks / launch gates

- No independent penetration test, load test or full ASVS certification. Broad SSRF tests do not prove every network-stack behavior.
- Evon is a fail-loud stub. No actual Prisma/Timbre, fallback or Tavily account was charged/tested. Credit eligibility and provider data policies remain owner responsibilities.
- Authenticated routes share an account limit; expensive providers add quotas, but export-specific rate limits and streaming large-account exports need further hardening for high scale.
- Current retention keeps saved data, usage and audit until account deletion; operator review is required. Cache cleanup depends on scheduled execution. Revocation markers are held for 24 hours alongside five-minute JWT expiry; production must preserve that short token lifetime.
- Development dependency audit findings must be reviewed before upgrades. Do not apply npm's incompatible downgrade suggestions blindly. Runtime audit was clean at the recorded check.
- Deterministic conversation has a bounded vocabulary; geography aliases are heuristic. Source verification does not establish need, consent, deliverability or current employment.

## Incident response

1. Set `GLOBAL_KILL_SWITCH=true`, redeploy and pause affected accounts using an `account.blocked` audit event. This stops provider consumption; use platform protection to contain unauthenticated traffic.
2. Preserve redacted request IDs, timestamps, job IDs and provider usage; avoid copying raw documents/audio into tickets.
3. Revoke/rotate affected credentials and sessions, inspect tenant boundaries and provider spending, and identify affected data.
4. Follow the operator's legal notification process; record decisions and containment times.
5. Patch, add a regression test, run CI and staged live smoke tests, restore cautiously and publish a factual post-incident review. Test backup restoration separately before relying on it.
