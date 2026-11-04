import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
if (
  process.env.SPECTRA_SEED_DEV !== "true" ||
  !url ||
  !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
)
  throw new Error(
    "Seed is restricted to explicitly enabled local development.",
  );
if (
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (process.env.SPECTRA_SEED_PASSWORD?.length ?? 0) < 12
)
  throw new Error(
    "Set local service role key and a 12+ character SPECTRA_SEED_PASSWORD.",
  );
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { error } = await db.auth.admin.createUser({
  email: "spectra@example.test",
  password: process.env.SPECTRA_SEED_PASSWORD,
  email_confirm: true,
});
if (error)
  throw new Error(
    "Development account creation failed; check whether it already exists.",
  );
console.log(
  "Local development account created: spectra@example.test. No prospect data seeded.",
);
