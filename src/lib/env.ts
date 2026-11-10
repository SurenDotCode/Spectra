import { z } from "zod";
const flag = z.enum(["true", "false"]).default("false");
export const envSchema = z
  .object({
    SPECTRA_MODE: z.enum(["setup", "live"]).default("setup"),
    APP_URL: z.url().default("http://127.0.0.1:3000"),
    SUPABASE_URL: z.url().optional(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(10).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
    CRON_SECRET: z.string().min(32).optional(),
    GNANI_API_KEY: z.string().min(10).optional(),
    GNANI_VOICE_ID: z.string().optional(),
    EVON_ACCESS_CONFIRMED: flag,
    EVON_CREDITS_CONFIRMED: flag,
    REASONING_PROVIDER: z.enum(["evon", "fallback"]).default("evon"),
    FALLBACK_APPROVED: flag,
    FALLBACK_BASE_URL: z.url().optional(),
    FALLBACK_API_KEY: z.string().optional(),
    FALLBACK_MODEL: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    PROVIDER_BUDGET_CONFIRMED: flag,
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    TURNSTILE_SITE_KEY: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    GLOBAL_KILL_SWITCH: flag,
    LOCAL_AUTO_SIGN_IN: flag,
    LOCAL_TEST_EMAIL: z.email().optional(),
    LOCAL_TEST_PASSWORD: z.string().min(32).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.LOCAL_AUTO_SIGN_IN === "true") {
      if (!v.LOCAL_TEST_EMAIL || !v.LOCAL_TEST_PASSWORD)
        ctx.addIssue({
          code: "custom",
          path: ["LOCAL_AUTO_SIGN_IN"],
          message: "Local test credentials are required",
        });
      if (
        !["127.0.0.1", "localhost", "[::1]"].includes(
          new URL(v.APP_URL).hostname,
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["APP_URL"],
          message: "Automatic local sign-in requires a loopback origin",
        });
    }
    if (v.SPECTRA_MODE === "live")
      for (const k of [
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "CRON_SECRET",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        "TURNSTILE_SITE_KEY",
        "TURNSTILE_SECRET_KEY",
      ] as const)
        if (!v[k])
          ctx.addIssue({
            code: "custom",
            path: [k],
            message: "Required in live mode",
          });
    if (v.FALLBACK_APPROVED === "true")
      for (const k of [
        "FALLBACK_BASE_URL",
        "FALLBACK_API_KEY",
        "FALLBACK_MODEL",
      ] as const)
        if (!v[k])
          ctx.addIssue({
            code: "custom",
            path: [k],
            message: "Required for approved fallback",
          });
  });
export function parseEnv(input: Record<string, unknown>) {
  const cleaned = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== ""),
  );
  const r = envSchema.safeParse(cleaned);
  if (!r.success)
    throw new Error(
      `Spectra configuration: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  return r.data;
}
