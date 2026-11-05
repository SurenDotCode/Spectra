import { headers } from "next/headers";
import { LoginForm } from "@/components/login-form";
import { parseEnv } from "@/lib/env";
export default async function Login() {
  const e = parseEnv(process.env);
  return (
    <section className="page prose auth-page">
      <h1>Sign in</h1>
      {e.SPECTRA_MODE === "setup" ? (
        <p className="notice">
          Sign-in is unavailable while the owner completes setup.
        </p>
      ) : null}
      <LoginForm
        siteKey={e.TURNSTILE_SITE_KEY}
        nonce={(await headers()).get("x-nonce") ?? ""}
      />
    </section>
  );
}
