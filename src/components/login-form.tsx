"use client";
import { useState, useRef } from "react";
import Script from "next/script";
import { z } from "zod";
import { api } from "@/lib/client-api";
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void },
      ) => string;
    };
  }
}
export function LoginForm({
  siteKey,
  nonce,
}: {
  siteKey?: string;
  nonce: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  async function submit(payload: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = await api(
        "/api/auth",
        payload,
        z.object({
          redirect: z.string().optional(),
          message: z.string().optional(),
        }),
      );
      if (result.redirect) window.location.assign(result.redirect);
      else setMessage(result.message ?? "Done.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not continue.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card stack">
      <div className="row">
        <button
          className="secondary"
          aria-pressed={mode === "signin"}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          className="secondary"
          aria-pressed={mode === "signup"}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit({
            action: mode,
            email: f.get("email"),
            password: f.get("password"),
            ...(mode === "signup" ? { captcha } : {}),
          });
        }}
      >
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            minLength={mode === "signup" ? 12 : 1}
            maxLength={128}
            required
          />
        </label>
        {mode === "signup" ? (
          <p className="small muted">
            Use at least 12 characters. Verify your email before researching.
          </p>
        ) : null}
        <div ref={widget} />
        {siteKey ? (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            nonce={nonce}
            onLoad={() => {
              if (widget.current)
                window.turnstile?.render(widget.current, {
                  sitekey: siteKey,
                  callback: setCaptcha,
                });
            }}
          />
        ) : null}
        <button
          className="primary"
          disabled={busy || (mode === "signup" && !captcha)}
        >
          {busy
            ? "Signing in…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
      <button
        className="secondary"
        disabled={busy}
        onClick={() => void submit({ action: "oauth" })}
      >
        Continue with Google
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
