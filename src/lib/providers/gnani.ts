import { z } from "zod";
import type { SttProvider, TtsProvider, Charge } from "./interfaces";
import { AppError } from "../errors";
import { inspectWav } from "../security/audio";
export class PrismaProvider implements SttProvider {
  constructor(
    private key: string,
    private charge: Charge,
    private request: typeof fetch = fetch,
  ) {}
  async transcribe(wav: Uint8Array, language: string) {
    const { seconds } = inspectWav(wav);
    await this.charge("stt_seconds", Math.ceil(seconds));
    const form = new FormData();
    form.append(
      "audio_file",
      new Blob([Uint8Array.from(wav)], { type: "audio/wav" }),
      "spectra-recording.wav",
    );
    form.append("language_code", language);
    const r = await this.request("https://api.vachana.ai/stt/v3", {
      method: "POST",
      headers: { "X-API-Key-ID": this.key },
      body: form,
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok)
      throw new AppError(
        "GNANI",
        503,
        "Prisma could not transcribe this recording. You can type instead.",
      );
    return z
      .object({ success: z.literal(true), transcript: z.string().max(20000) })
      .parse(await r.json()).transcript;
  }
}
export class TimbreProvider implements TtsProvider {
  constructor(
    private key: string,
    private voice: string,
    private charge: Charge,
    private request: typeof fetch = fetch,
  ) {}
  async speak(text: string, language: string) {
    if (text.length > 1200 || !text.trim())
      throw new AppError(
        "TEXT",
        400,
        "Keep spoken briefings under 1,200 characters.",
      );
    await this.charge("tts_chars", text.length);
    const r = await this.request(
      "https://api.vachana.ai/api/v1/tts/inference",
      {
        method: "POST",
        headers: {
          "X-API-Key-ID": this.key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice: this.voice,
          model: "timbre-v2.5",
          language,
          audio_config: {
            encoding: "linear_pcm",
            container: "wav",
            num_channels: 1,
            sample_rate: 16000,
            sample_width: 2,
          },
        }),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!r.ok || !r.headers.get("content-type")?.includes("audio/"))
      throw new AppError(
        "GNANI",
        503,
        "Timbre could not generate speech. The text is still available.",
      );
    const audio = new Uint8Array(await r.arrayBuffer());
    if (audio.length > 4000000) throw new AppError("AUDIO", 502);
    return audio;
  }
}
