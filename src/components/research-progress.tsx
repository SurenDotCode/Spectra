"use client";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import Link from "next/link";
import { api, readApi } from "@/lib/client-api";
const responseSchema = z.object({
  searches: z.array(
    z.object({
      id: z.uuid(),
      status: z.string(),
      stage: z.number(),
      data: z.object({ reason: z.string().optional() }),
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
}: {
  offerId?: string;
  initialId?: string;
}) {
  const [id, setId] = useState(initialId ?? "");
  const [state, setState] = useState<z.infer<typeof responseSchema> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!id) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await readApi(`/api/research?id=${id}`, responseSchema);
        if (stopped) return;
        setState(result);
        const status = result.searches[0]?.status;
        if (run && ["queued", "running"].includes(status)) {
          await api(
            "/api/research",
            { action: "tick", id },
            z.object({ id: z.uuid() }),
          );
        }
        if (!stopped && ["queued", "running"].includes(status))
          timer = setTimeout(() => void poll(), 2500);
      } catch (e) {
        if (!stopped)
          setError(e instanceof Error ? e.message : "Progress unavailable.");
      }
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, run]);
  const job = state?.searches[0];
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
        <span className="badge">{job?.status ?? "Ready"}</span>
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
      {job?.data.reason ? <p className="notice">{job.data.reason}</p> : null}
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
