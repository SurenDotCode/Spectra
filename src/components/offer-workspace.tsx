"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { api } from "@/lib/client-api";
import { offerSchema, type Offer } from "@/lib/schemas";
import { VoiceInput, SpeakButton, toBase64 } from "./voice";
export function OfferWorkspace() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [countries, setCountries] = useState("");
  const [languages, setLanguages] = useState("English");
  const [scope, setScope] = useState<"nearby" | "worldwide" | "both">("both");
  const [profile, setProfile] = useState<Offer | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function understand() {
    setBusy(true);
    setMessage("");
    try {
      const r = await api(
        "/api/offers",
        {
          action: "understand",
          description,
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
      );
      setProfile(r.profile);
      setQuestions(r.questions);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to understand this offer.",
      );
    } finally {
      setBusy(false);
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
              onChange={(e) => setDescription(e.target.value)}
              maxLength={20000}
              placeholder="Talk, or type what you sell."
            />
          </label>
          <VoiceInput
            onTranscript={(text) =>
              setDescription((s) => (s ? `${s}\n${text}` : text))
            }
          />

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
            {busy ? "Thinking…" : "Review offer"}
          </button>
        </div>
      </div>
      <div className="stack">
        <div className="card confirmation">
          {profile ? (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const r = await api(
                    "/api/offers",
                    { action: "confirm", profile },
                    z.object({ id: z.uuid(), profile: offerSchema }),
                  );
                  router.push(`/research?offer=${r.id}`);
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Could not save.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>Review your offer</h2>
              {questions.length ? (
                <div className="notice">
                  <p>Fill in the gaps:</p>
                  <ul>
                    {questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                  <SpeakButton text={questions.join(" ")} />
                </div>
              ) : null}
              {Object.entries(profile).map(([key, value]) =>
                key === "scope" ? null : (
                  <label key={key}>
                    {key.replace(/([A-Z])/g, " $1")}
                    <textarea
                      rows={2}
                      value={Array.isArray(value) ? value.join("\n") : value}
                      maxLength={1500}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          [key]: Array.isArray(value)
                            ? e.target.value.split("\n").filter(Boolean)
                            : e.target.value,
                        })
                      }
                    />
                  </label>
                ),
              )}
              <p className="small muted">
                Review now. Start research on the next screen.
              </p>
              <button className="primary" disabled={busy}>
                Looks right
              </button>
            </form>
          ) : (
            <div className="empty">
              <h2>Your offer summary appears here.</h2>
            </div>
          )}
        </div>
        <p role="status" className={message ? "notice" : ""}>
          {message}
        </p>
      </div>
    </div>
  );
}
