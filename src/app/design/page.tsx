import { notFound } from "next/navigation";

export default function Design() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <section className="design-showcase design-glow stack">
      <span className="eyebrow">Development only</span>
      <h1>Spectra / Material study</h1>
      <p>Static component states. No research or microphone activity.</p>
      <div className="design-grid">
        <article className="design-swatch stack">
          <h2>Actions</h2>
          <button className="design-primary">Talk</button>
          <button className="secondary">Save</button>
          <button className="design-primary" disabled>
            Thinking…
          </button>
        </article>
        <article className="design-swatch stack">
          <h2>Evidence</h2>
          <span className="design-verified">Verified</span>
          <span className="design-inferred">Inferred</span>
          <span className="design-unknown">Unknown</span>
          <span className="design-concern">Concern</span>
        </article>
        <article className="design-swatch stack">
          <h2>Fields</h2>
          <label>
            Transcript
            <textarea placeholder="Tell me what you sell." />
          </label>
          <label>
            Location
            <input placeholder="City, country" />
          </label>
        </article>
        <article className="design-swatch stack">
          <h2>States</h2>
          <p>Nothing yet. Describe your offer.</p>
          <p role="status">Reading…</p>
          <p className="design-concern">Search paused. Retry when ready.</p>
          <progress value={2} max={4} aria-label="Example progress" />
        </article>
        <article className="design-swatch stack">
          <h2>Voice</h2>
          <button className="orb" disabled aria-label="Static voice control">
            ●
          </button>
          <span>Idle · Listening · Thinking</span>
          <button className="secondary">Stop speaking</button>
        </article>
        <article className="design-swatch stack">
          <h2>Surface</h2>
          <p>20px blur. 28px radius. One raised layer.</p>
          <div className="row">
            <span className="badge">Saved</span>
            <span className="badge">72 / 100</span>
          </div>
          <div className="tabs">
            <button>Verified</button>
            <button>Inferred</button>
          </div>
        </article>
      </div>
    </section>
  );
}
