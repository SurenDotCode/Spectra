"use client";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, readApi } from "@/lib/client-api";
const responseSchema = z.object({
  searches: z.array(
    z.object({
      id: z.uuid(),
      status: z.string(),
      stage: z.number(),
      data: z.object({
        reason: z.string().optional(),
        retryAt: z.number().optional(),
      }),
      offer_id: z.uuid(),
    }),
  ),
  stages: z.array(
    z.object({
      stage: z.number(),
      status: z.string(),
      item_key: z.string(),
      attempts: z.number(),
    }),
  ),
});
export function ResearchProgress({
  offerId,
  initialId,
  autoRun = false,
}: {
  offerId?: string;
  initialId?: string;
  autoRun?: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState(initialId ?? "");
  const [state, setState] = useState<z.infer<typeof responseSchema> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [pollVersion, setPollVersion] = useState(0);
  const requestKey = useRef(crypto.randomUUID());
  const [run, setRun] = useState(autoRun || Boolean(initialId));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!id) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await readApi(`/api/research?id=${id}`, responseSchema);
        if (stopped) return;
        setError("");
        setState(result);
        const status = result.searches[0]?.status;
        const retryAt = result.searches[0]?.data.retryAt ?? 0;
        // Recover searches paused by the old worker's transient-limit handling.
        // Never auto-retry the app's daily quota or budget/kill-switch pauses.
        if (
          run &&
          status === "quota" &&
          result.searches[0]?.data.reason?.startsWith(
            "The reasoning provider's free request or token limit",
          )
        ) {
          await api(
            "/api/research",
            { action: "retry", id },
            z.object({ id: z.uuid() }),
          );
          if (!stopped) timer = setTimeout(() => void poll(), 2500);
          return;
        }
        if (status === "completed" && autoRun) {
          router.replace(`/prospects?search=${id}`);
          return;
        }
        if (run && ["queued", "running"].includes(status)) {
          if (retryAt > Date.now()) {
            timer = setTimeout(
              () => void poll(),
              Math.min(30000, retryAt - Date.now() + 500),
            );
            return;
          }
          await api(
            "/api/research",
            { action: "tick", id },
            z.object({ id: z.uuid() }),
          );
        }
        if (!stopped && ["queued", "running"].includes(status))
          timer = setTimeout(() => void poll(), 2500);
      } catch (e) {
        if (!stopped) {
          setError(`${e instanceof Error ? e.message : "Progress unavailable."} Reconnecting automatically in 10 seconds.`);
          timer = setTimeout(() => void poll(), 10000);
        }
      }
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, run, autoRun, router, pollVersion]);
  const job = state?.searches[0];
  const waiting = Boolean(
    job?.data.retryAt && ["queued", "running"].includes(job.status),
  );
  const seconds = Math.max(
    0,
    Math.ceil(((job?.data.retryAt ?? 0) - now) / 1000),
  );
  async function start() {
    setBusy(true);
    setError("");
    try {
      const result = await api(
        "/api/research",
        { action: "start", offerId, idempotencyKey: requestKey.current },
        z.object({ id: z.uuid() }),
      );
      setId(result.id);
      setRun(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start research.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card stack">
      <div className="row spread">
        <h2>Progress</h2>
        <span className="badge">
          {!run && job?.status !== "completed"
            ? "Paused"
            : waiting
              ? seconds > 0 && now
                ? `Next request in ${seconds}s`
                : "Resuming…"
              : (job?.status ?? "Ready")}
        </span>
      </div>
      {["Finding", "Reading", "Contacts", "Ranking"].map((name, i) => (
        <div
          className={`stage ${(job?.stage ?? -1) > i ? "complete" : ""}`}
          key={name}
        >
          <div className="row spread">
            <h3>
              {i + 1}. {name}
            </h3>
            <span className="small">
              {(job?.stage ?? -1) > i
                ? "Complete"
                : job?.stage === i
                  ? "In progress"
                  : "Waiting"}
            </span>
          </div>
          <p className="small muted">
            {state?.stages.filter(
              (s) => s.stage === i && s.status === "completed",
            ).length ?? 0}{" "}
            done ·{" "}
            {state?.stages.filter((s) => s.stage === i && s.status === "failed")
              .length ?? 0}{" "}
            failed
          </p>
        </div>
      ))}
      {!id ? (
        <button
          className="primary"
          disabled={!offerId || busy}
          onClick={() => void start()}
        >
          {busy ? "Starting…" : "Find prospects"}
        </button>
      ) : null}
      {id && job?.status !== "completed" ? (
        <div className="row">
          <button className="secondary" onClick={() => setRun((r) => !r)}>
            {run ? "Pause processing" : "Resume processing"}
          </button>
          {["failed", "quota"].includes(job?.status ?? "") ? (
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await api(
                    "/api/research",
                    { action: "retry", id },
                    z.object({ id: z.uuid() }),
                  );
                  setRun(true);
                  setPollVersion((v) => v + 1);
                  setState(
                    await readApi(`/api/research?id=${id}`, responseSchema),
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Retry failed.");
                }
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {job?.status === "completed" ? (
        <Link className="button primary" href={`/prospects?search=${id}`}>
          View prospects
        </Link>
      ) : null}
      {waiting ? (
        <p className="notice" role="status">
          {!run
            ? "Processing is paused. Resume to continue from the saved results."
            : `The free reasoning service needs a short pause between requests. ${seconds > 0 && now ? `Next attempt in ${seconds} seconds.` : "Checking capacity now."} Your completed work is saved. Keep this page open; processing resumes automatically.`}
        </p>
      ) : job?.data.reason ? (
        <p className="notice">{job.data.reason}</p>
      ) : null}
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
