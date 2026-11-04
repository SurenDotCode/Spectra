"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { z } from "zod";
import { readApi } from "@/lib/client-api";
const schema = z.object({
  searches: z.array(
    z.object({
      id: z.uuid(),
      status: z.string(),
      created_at: z.string(),
      data: z.object({
        offer: z.object({ purpose: z.string() }),
        reason: z.string().optional(),
      }),
    }),
  ),
});
export function History() {
  const [items, setItems] = useState<z.infer<typeof schema>["searches"]>([]);
  const [message, setMessage] = useState("Loading history…");
  useEffect(() => {
    let active = true;
    readApi("/api/research", schema)
      .then((r) => {
        if (active) {
          setItems(r.searches);
          setMessage(
            r.searches.length
              ? ""
              : "No searches yet. Your next discovery starts with an offer.",
          );
        }
      })
      .catch((e) => {
        if (active)
          setMessage(e instanceof Error ? e.message : "History unavailable.");
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="stack">
      <div className="row">
        <Link className="button primary" href="/workspace">
          New discovery ↗
        </Link>
        <Link className="button secondary" href="/prospects">
          All saved prospects
        </Link>
      </div>
      <p role="status">{message}</p>
      {items.map((x) => (
        <article className="card row spread" key={x.id}>
          <div>
            <span className="badge">{x.status}</span>
            <h3>{x.data.offer.purpose}</h3>
            <p className="small muted">
              {new Date(x.created_at).toLocaleString()} · {x.data.reason}
            </p>
          </div>
          <Link
            className="button secondary"
            href={
              x.status === "completed"
                ? `/prospects?search=${x.id}`
                : `/research?id=${x.id}`
            }
          >
            {x.status === "completed" ? "View prospects" : "Resume research"} →
          </Link>
        </article>
      ))}
    </div>
  );
}
