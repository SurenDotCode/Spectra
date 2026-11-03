# Spectra decisions

- Use the requested Next.js deployment target, not Sites hosting; retain a local repository until credentials and CI are ready.
- Setup mode renders the product and clear connection requirements without fake prospects or bypass authentication; live mode fails boot on missing infrastructure configuration.
- Provider credentials are optional capability gates; an unavailable integration returns a clear error instead of fabricated results.
- All auth is server-side to allow httpOnly cookies; no browser Supabase client.
- Strict CSP is used even locally; production-mode browser tests avoid development tooling that needs unsafe-eval.
- Start with 5 as a maximum batch size; evidence quality determines the actual count.
