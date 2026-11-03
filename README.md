# Spectra

Voice-assisted, evidence-led client discovery. Spectra identifies plausible prospects, never guaranteed buyers.

## Local setup

Requires Node.js 24 and npm. Run `npm ci`, then `npm run build` and `npm start`. Open http://127.0.0.1:3000. Without configuration the application is in clearly labeled setup mode; it does not invent prospects or bypass authentication.

To configure, copy `.env.example` to `.env.local`, remove empty optional entries, and supply infrastructure credentials. Never commit this file. Set `SPECTRA_MODE=live` only when the required environment is complete. Provider approval flags default to false. Check `docs/RUNBOOK.md` before deploying.

## Checks

`npm run check` runs TypeScript, ESLint, Vitest, and a production build. Each phase is committed only after these checks pass. External integration and deployment checks require connected accounts; local passing tests do not prove those integrations.
