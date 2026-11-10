"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { api } from "@/lib/client-api";
import { offerSchema } from "@/lib/schemas";
import { VoiceInput, toBase64 } from "./voice";
export function OfferWorkspace() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [countries, setCountries] = useState("");
  const [languages, setLanguages] = useState("English");
  const [scope, setScope] = useState<"nearby" | "worldwide" | "both">("both");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  function cancel() {
    active.current?.abort();
    active.current = null;
    setBusy(false);
  }
  async function understand(value = description) {
    cancel();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const r = await api(
        "/api/offers",
        {
          action: "understand",
          description: value,
          preferences: {
            location,
            countries: countries
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
            languages: languages
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
            scope,
            industry: "Not specified",
            businessSize: "Not specified",
          },
        },
        z.object({ profile: offerSchema, questions: z.array(z.string()) }),
        controller.signal,
      );
      const saved = await api(
        "/api/offers",
        { action: "confirm", profile: r.profile },
        z.object({ id: z.uuid(), profile: offerSchema }),
        controller.signal,
      );
      const research = await api(
        "/api/research",
        {
          action: "start",
          offerId: saved.id,
          idempotencyKey: crypto.randomUUID(),
        },
        z.object({ id: z.uuid() }),
        controller.signal,
      );
      controller.signal.throwIfAborted();
      router.push(`/research?id=${research.id}&run=1`);
    } catch (e) {
      if (controller.signal.aborted) return;
      setMessage(
        e instanceof Error ? e.message : "Unable to understand this offer.",
      );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <div className="offer-session">
      <div className="stack">
        <div className="card session-card">
          <label className="session-transcript">
            Your offer
            <textarea
              value={description}
              onChange={(e) => {
                cancel();
                setDescription(e.target.value);
              }}
              maxLength={20000}
              placeholder="Talk, or type what you sell."
            />
          </label>
          <VoiceInput
            autoSubmit
            onTranscript={(text) => {
              const value = description ? `${description}\n${text}` : text;
              setDescription(value);
              void understand(value);
            }}
          />
          {busy ? (
            <button type="button" className="secondary" onClick={cancel}>
              Stop and edit
            </button>
          ) : null}

          <label className="small session-upload">
            Upload a document · MD, TXT, PDF · 2 MB
            <input
              type="file"
              accept=".md,.txt,.pdf"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2000000) {
                  setMessage("Documents must be under 2 MB.");
                  return;
                }
                setBusy(true);
                try {
                  const r = await api(
                    "/api/upload",
                    {
                      name: file.name,
                      base64: toBase64(
                        new Uint8Array(await file.arrayBuffer()),
                      ),
                    },
                    z.object({ text: z.string() }),
                  );
                  setDescription(r.text);
                  setMessage(
                    "Document read. Review the text before submitting.",
                  );
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Upload failed.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </div>
        <div className="card preferences">
          <div className="eyebrow">Your market</div>
          <label>
            Search reach
            <select
              value={scope}
              onChange={(e) =>
                setScope(
                  z.enum(["nearby", "worldwide", "both"]).parse(e.target.value),
                )
              }
            >
              <option value="both">Nearby + worldwide</option>
              <option value="nearby">Nearby</option>
              <option value="worldwide">Worldwide</option>
            </select>
          </label>
          <label>
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={150}
              placeholder="City, country"
            />
          </label>
          <label>
            Countries
            <input
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              maxLength={500}
              placeholder="Comma-separated countries"
            />
          </label>
          <label>
            Languages
            <input
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              maxLength={500}
            />
          </label>
          <button
            className="primary"
            disabled={busy || description.trim().length < 20}
            onClick={() => void understand()}
          >
            {busy ? "Starting research…" : "Find prospects"}
          </button>
        </div>
      </div>
      <div className="stack">
        <p role="status" className={message ? "notice" : ""}>
          {message}
        </p>
      </div>
    </div>
  );
}
