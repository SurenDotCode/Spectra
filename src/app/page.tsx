import Link from "next/link";
import { Mic } from "lucide-react";

export default function Home() {
  return (
    <section className="hero shell">
      <div className="eyebrow">Voice-led discovery</div>
      <h1>
        Find a reason
        <br />
        <span>to reach out.</span>
      </h1>
      <p className="lede">
        Talk through your offer. Explore businesses with evidence.
      </p>
      <div className="hero-voice">
        <div className="orb hero-art" aria-hidden="true">
          <Mic />
        </div>
        <Link className="button primary" href="/workspace">
          Talk
        </Link>
        <p className="voice-caption">Opens your session. Typing works too.</p>
      </div>
    </section>
  );
}
