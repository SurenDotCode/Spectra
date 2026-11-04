import { headers } from "next/headers";
import { LoginForm } from "@/components/login-form";
import { parseEnv } from "@/lib/env";
export default async function Login() {
  const e = parseEnv(process.env);
  return (
    <section className="page prose">
      <div className="eyebrow">YOUR RESEARCH, IN ONE PLACE</div>
      <h1>Welcome to Spectra.</h1>
      {e.SPECTRA_MODE === "setup" ? (
        <p className="notice">
          Setup mode. Authentication is unavailable until the owner connects
          Supabase, rate limiting, and signup protection.
        </p>
      ) : null}
      <LoginForm
        siteKey={e.TURNSTILE_SITE_KEY}
        nonce={(await headers()).get("x-nonce") ?? ""}
      />
    </section>
  );
}
