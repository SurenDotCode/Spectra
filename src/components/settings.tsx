"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { api, readApi } from "@/lib/client-api";
export function Settings() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [factor, setFactor] = useState("");
  const [usage, setUsage] = useState<
    Array<{ feature: string; day: string; amount: number }>
  >([]);
  async function action(payload: unknown) {
    try {
      const r = await api(
        "/api/account",
        payload,
        z.object({
          message: z.string().optional(),
          secret: z.string().optional(),
          factorId: z.string().optional(),
          data: z.unknown().optional(),
        }),
      );
      setMessage(r.message ?? "Ready.");
      if (r.secret) {
        setSecret(r.secret);
        setFactor(r.factorId ?? "");
      }
      if (r.data) {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(r.data, null, 2)], {
            type: "application/json",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "spectra-account.json";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed.");
    }
  }
  return (
    <div className="stack">
      <section className="card stack">
        <h2>Appearance</h2>
        <div className="row">
          <button
            className="secondary"
            onClick={() => {
              document.documentElement.className = "theme-light";
              localStorage.setItem("spectra-theme", "theme-light");
            }}
          >
            Light
          </button>
          <button
            className="secondary"
            onClick={() => {
              document.documentElement.className = "theme-dark";
              localStorage.setItem("spectra-theme", "theme-dark");
            }}
          >
            Dark
          </button>
        </div>
      </section>
      <section className="card stack">
        <h2>Usage & account security</h2>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const r = await readApi(
                "/api/account",
                z.object({
                  usage: z.array(
                    z.object({
                      feature: z.string(),
                      day: z.string(),
                      amount: z.number(),
                    }),
                  ),
                  factors: z.array(
                    z.object({ id: z.string(), status: z.string() }),
                  ),
                }),
              );
              setUsage(r.usage);
              setFactor(r.factors[0]?.id ?? "");
              setMessage(
                r.usage.length ? "Usage loaded." : "No recorded usage.",
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Unavailable.");
            }
          }}
        >
          Load usage and authenticator status
        </button>
        {usage.map((x) => (
          <p key={x.day + x.feature}>
            {x.day} · {x.feature}: {x.amount}
          </p>
        ))}
        <p className="small muted">
          Daily research limit: 5 batches per account. Voice input: 300 seconds.
          Speech output: 6,000 characters. Global caps also apply.
        </p>
        <button
          className="secondary"
          onClick={() => void action({ action: "enroll" })}
        >
          Set up authenticator (TOTP)
        </button>
        {secret ? (
          <p className="notice">
            Add this secret to your authenticator, then verify:{" "}
            <code>{secret}</code>
          </p>
        ) : null}
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void action({
              action: "verify",
              factorId: factor,
              code: new FormData(e.currentTarget).get("code"),
            });
          }}
        >
          <label>
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </label>
          <button className="secondary" disabled={!factor}>
            Verify code
          </button>
        </form>
      </section>
      <section className="card stack">
        <h2>Your data</h2>
        <p>
          Audio is discarded after transcription. Your notes are labeled
          user-reported.
        </p>
        <button
          className="secondary"
          onClick={() => void action({ action: "export" })}
        >
          Export my data
        </button>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void action({
              action: "delete",
              confirmation: new FormData(e.currentTarget).get("confirmation"),
            });
          }}
        >
          <label>
            To permanently delete your account, type DELETE MY SPECTRA DATA
            <input name="confirmation" required />
          </label>
          <button className="secondary">Delete my data and account</button>
        </form>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await api(
                "/api/auth",
                { action: "logout" },
                z.object({ redirect: z.string() }),
              );
              router.push("/login");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Could not sign out.",
              );
            }
          }}
        >
          Sign out of all sessions
        </button>
      </section>
      <p role="status">{message}</p>
    </div>
  );
}
