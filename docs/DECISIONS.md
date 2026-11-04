# Spectra decisions

- Use the requested Next.js deployment target, not Sites hosting; retain a local repository until credentials and CI are ready.
- Setup mode renders the product and clear connection requirements without fake prospects or bypass authentication; live mode fails boot on missing infrastructure configuration.
- Provider credentials are optional capability gates; an unavailable integration returns a clear error instead of fabricated results.
- All auth is server-side to allow httpOnly cookies; no browser Supabase client.
- Strict CSP is used even locally; production-mode browser tests avoid development tooling that needs unsafe-eval.
- Start with 5 as a maximum batch size; evidence quality determines the actual count.

- Use database-backed leased items instead of adding a queue service. One invocation does one item; browser ticks provide progress. Daily Hobby cron is recovery only; unattended production needs a frequent scheduler.
- Do not retain raw uploads/audio or create a Storage bucket solely to satisfy a stack checkbox. This reduces exposure; opt-in recording retention is not implemented.
- Keep Evon unavailable until its actual contract is provided. Implement a separately approved fallback adapter, never a guessed endpoint or hidden provider substitution.
- Use deterministic conversational intents for answers over stored evidence. This limits vocabulary and arbitrary follow-up research; it avoids model-invented facts and extra reasoning cost on every question.
- User feedback is supplied as labeled context to later discovery. No separate numeric feedback adjustment is claimed.
- Use lightweight CSS motion with reduced-motion support instead of a Framer Motion runtime dependency. Radix provides evidence tabs; the local button foundation uses shadcn-style variants.
- Mark industry as inferred, retain source-dated observations separately, and reject unsupported contact values, role claims and integrations. Exact quotes establish provenance, not truth or demand.
- Keep source data until account deletion, and expire cache after seven days. Owner/legal review must decide retention periods before public launch. No claim of immediate backup erasure is made.
- The repository was initially private. The owner explicitly authorized making it public on 4 November 2026 to use free CodeQL after GitHub rejected private code-scanning reporting. No paid upgrade was purchased and no security gate was bypassed.
