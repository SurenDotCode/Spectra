# Spectra

Voice-assisted, evidence-led client discovery. Spectra identifies plausible prospects, never guaranteed buyers.

## Local setup

Requires Node.js 24 and npm. Run `npm ci`, then `npm run build` and `npm start`. Open http://127.0.0.1:3000. Without configuration the application is in clearly labeled setup mode; it does not invent prospects or bypass authentication.

To configure, copy `.env.example` to `.env.local`, remove empty optional entries, and supply infrastructure credentials. Never commit this file. Set `SPECTRA_MODE=live` only when the required environment is complete. Provider approval flags default to false. Check `docs/RUNBOOK.md` before deploying.

## Checks

`npm run check` runs TypeScript, ESLint, Vitest, and a production build. `npm run test:e2e` runs browser flows and axe scans; `npx supabase test db` tests isolation against local Supabase (Docker required). External integration and deployment checks require configured accounts; local passing tests do not prove those integrations.

## What is included

Editable voice/text/document offer intake; confirmed versioned profiles; staged resumable discovery; safe public-page research; source-backed observations, contacts and public LinkedIn references; transparent ranking; filters, shortlist, history and CSV; concise voice conversation; user-reported outcomes; account controls; quotas and security tests.

No fake-data fallback exists. Evon is an explicit unavailable adapter pending an official contract. Actual discovery requires Tavily and an explicitly approved reasoning fallback (or a completed Evon adapter). Gnani voice requires its API key. Conversation handles bounded intents; missing-information research requires a newly confirmed search.

## Documentation

- [Final report and outstanding gates](docs/FINAL_REPORT.md)
- [Setup, environment variables and deployment](docs/RUNBOOK.md)
- [Architecture](docs/ARCHITECTURE.md) and [decisions](docs/DECISIONS.md)
- [Security evidence](docs/SECURITY.md), [threat model](docs/THREAT_MODEL.md), [adversarial review](docs/HARDENING.md)
- [Provider contracts and official sources](docs/PROVIDERS.md)
- [Phase ledger](docs/PHASES.md)

The privacy and terms screens are drafts requiring operator/legal completion before public launch. A local passing build is not a claim of production readiness or compliance certification.
