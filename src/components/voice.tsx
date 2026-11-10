"use client";
import { useRef, useState, useEffect } from "react";
import { Mic, Square, Volume2 } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/client-api";
export function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
function pcmWav(chunks: Float32Array[]) {
  const samples = chunks.reduce((n, c) => n + c.length, 0);
  const bytes = new Uint8Array(44 + samples * 2);
  const v = new DataView(bytes.buffer);
  function text(offset: number, s: string) {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  }
  text(0, "RIFF");
  v.setUint32(4, bytes.length - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, samples * 2, true);
  let i = 44;
  for (const c of chunks)
    for (const sample of c) {
      v.setInt16(i, Math.max(-1, Math.min(1, sample)) * 32767, true);
      i += 2;
    }
  return bytes;
}
export function VoiceInput({
  onTranscript,
  autoSubmit = false,
}: {
  onTranscript: (text: string) => void;
  autoSubmit?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const active = useRef<{
    ctx: AudioContext;
    stream: MediaStream;
    chunks: Float32Array[];
    timer: ReturnType<typeof setTimeout>;
    node: AudioWorkletNode;
  } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const animation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelAnimationFrame(animation.current);
      if (active.current) {
        clearTimeout(active.current.timer);
        active.current.stream.getTracks().forEach((t) => t.stop());
        void active.current.ctx.close();
      }
    };
  }, []);
  async function stop() {
    const a = active.current;
    if (!a) return;
    active.current = null;
    clearTimeout(a.timer);
    cancelAnimationFrame(animation.current);
    a.node.disconnect();
    a.stream.getTracks().forEach((t) => t.stop());
    await a.ctx.close();
    setRecording(false);
    setBusy(true);
    try {
      const { text } = await api(
        "/api/voice",
        { action: "transcribe", base64: toBase64(pcmWav(a.chunks)), language },
        z.object({ text: z.string() }),
      );
      onTranscript(text);
      setMessage(
        autoSubmit
          ? "Sent. Edit the transcript to stop and correct it."
          : "Transcript ready. Edit before submitting.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    setBusy(true);
    setMessage("");
    let stream: MediaStream | undefined;
    let ctx: AudioContext | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1 },
        video: false,
      });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      ctx = new AudioContext({ sampleRate: 16000 });
      await ctx.audioWorklet.addModule("/pcm-worklet.js");
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        await ctx.close();
        return;
      }
      const node = new AudioWorkletNode(ctx, "spectra-pcm");
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      source.connect(node);
      const silent = ctx.createGain();
      silent.gain.value = 0;
      node.connect(silent).connect(ctx.destination);
      const chunks: Float32Array[] = [];
      let count = 0;
      let speechSamples = 0;
      let quietSamples = 0;
      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (count + e.data.length <= 320000) {
          chunks.push(e.data);
          count += e.data.length;
        }
        if (autoSubmit && active.current) {
          const rms = Math.sqrt(
            e.data.reduce((sum, value) => sum + value * value, 0) /
              e.data.length,
          );
          if (rms > 0.015) {
            speechSamples += e.data.length;
            quietSamples = 0;
          } else quietSamples += e.data.length;
          if (speechSamples > 4800 && quietSamples > 24000) void stop();
        }
      };
      active.current = {
        ctx,
        stream,
        chunks,
        node,
        timer: setTimeout(() => void stop(), 19500),
      };
      setRecording(true);
      function draw() {
        const c = canvas.current;
        const g = c?.getContext("2d");
        if (g && c) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteTimeDomainData(data);
          g.clearRect(0, 0, c.width, c.height);
          g.strokeStyle = getComputedStyle(document.documentElement)
            .getPropertyValue("--color-violet-soft")
            .trim();
          g.beginPath();
          data.forEach((value, index) => {
            const x = (index * c.width) / data.length,
              y = (value * c.height) / 256;
            if (index) g.lineTo(x, y);
            else g.moveTo(x, y);
          });
          g.stroke();
        }
        animation.current = requestAnimationFrame(draw);
      }
      draw();
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      await ctx?.close();
      setMessage("Microphone unavailable. Use the text box instead.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="voice-control" data-recording={recording} data-busy={busy}>
      <div className="voice-layout">
        <label>
          Speech language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={recording}
          >
            {[
              ["en-IN", "English"],
              ["hi-IN", "Hindi"],
              ["ta-IN", "Tamil"],
              ["te-IN", "Telugu"],
              ["kn-IN", "Kannada"],
              ["ml-IN", "Malayalam"],
              ["mr-IN", "Marathi"],
              ["gu-IN", "Gujarati"],
              ["bn-IN", "Bengali"],
              ["pa-IN", "Punjabi"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="orb"
          aria-label={
            recording ? "Stop recording" : "Start recording, up to 20 seconds"
          }
          aria-pressed={recording}
          disabled={busy}
          onClick={() => void (recording ? stop() : start())}
        >
          {recording ? (
            <Square aria-hidden="true" />
          ) : (
            <Mic aria-hidden="true" />
          )}
        </button>
        <canvas ref={canvas} width={160} height={45} aria-hidden="true" />
      </div>
      <p className="small voice-state" role="status">
        {busy
          ? "Processing…"
          : recording
            ? "Listening. Tap to stop."
            : message || "Tap to talk · 20 seconds maximum"}
      </p>
    </div>
  );
}
export function SpeakButton({ text }: { text: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const epoch = useRef(0);
  const url = useRef("");
  const [busy, setBusy] = useState(false);
  function stop() {
    epoch.current++;
    audio.current?.pause();
    audio.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
    setBusy(false);
  }
  useEffect(
    () => () => {
      epoch.current++;
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  const [error, setError] = useState("");
  async function speak() {
    stop();
    const version = epoch.current;
    setBusy(true);
    setError("");
    try {
      const r = await api(
        "/api/voice",
        { action: "speak", text: text.slice(0, 1200), language: "en-IN" },
        z.object({ base64: z.string() }),
      );
      if (version !== epoch.current) return;
      url.current = URL.createObjectURL(
        new Blob([Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0))], {
          type: "audio/wav",
        }),
      );
      audio.current = new Audio(url.current);
      await audio.current.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speech unavailable.");
    } finally {
      if (version === epoch.current) setBusy(false);
    }
  }
  return (
    <div>
      <div className="speech-actions">
        <button
          type="button"
          className="secondary"
          disabled={busy || !text}
          onClick={() => void speak()}
        >
          <Volume2 size={16} aria-hidden="true" />
          {busy ? "Preparing…" : "Listen"}
        </button>
        <button type="button" className="secondary" onClick={stop}>
          <Square size={14} aria-hidden="true" /> Stop speaking
        </button>
      </div>
      {error ? (
        <p className="small" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
