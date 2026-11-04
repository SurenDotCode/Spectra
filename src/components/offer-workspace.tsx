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
    <div className="grid">
      <div className="stack">
        <div className="card">
          <div className="eyebrow">01 / DESCRIBE YOUR OFFER</div>
          <VoiceInput
            onTranscript={(text) =>
              setDescription((s) => (s ? `${s}\n${text}` : text))
            }
          />
          <label>
            What did you build?
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={20000}
              placeholder="What does it do, who is it for, and what does it need to work?"
            />
          </label>
          <label className="small">
            Or upload a README or workflow (MD, TXT, PDF · 2 MB max)
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
        <div className="card stack">
          <div className="eyebrow">02 / WHERE CAN YOU HELP?</div>
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
            Your location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={150}
              placeholder="City, country"
            />
          </label>
          <label>
            Countries you can serve
            <input
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              maxLength={500}
              placeholder="Comma-separated countries"
            />
          </label>
          <label>
            Supported languages
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
            {busy ? "Understanding your offer…" : "Build my offer profile ↗"}
          </button>
        </div>
      </div>
      <div className="stack">
        <div className="card">
          <div className="eyebrow">03 / REVIEW BEFORE RESEARCH</div>
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
              <h2>Here’s what I understand.</h2>
              {questions.length ? (
                <div className="notice">
                  <p>Clarify these gaps by editing the profile:</p>
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
                Confirming saves a version of this profile. Research starts only
                when you request it on the next screen.
              </p>
              <button className="primary" disabled={busy}>
                Confirm profile →
              </button>
            </form>
          ) : (
            <div className="empty">
              <h2>First, a clear picture.</h2>
              <p className="muted">
                Your offer profile will appear here. You’ll review capabilities,
                integrations, price, and limitations before Spectra researches
                any business.
              </p>
              <div className="badge">No research without your confirmation</div>
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
