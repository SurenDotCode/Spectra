import type { z } from "zod";
import type { Source } from "../schemas";
export interface SttProvider {
  transcribe(wav: Uint8Array, language: string): Promise<string>;
}
export interface TtsProvider {
  speak(text: string, language: string): Promise<Uint8Array>;
}
export interface ReasoningProvider {
  readonly name: string;
  generate<T>(
    task: string,
    data: unknown,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
  ): Promise<T>;
}
export interface SearchProvider {
  search(query: string): Promise<Source[]>;
}
export interface FetchProvider {
  fetch(url: string): Promise<Source>;
}
export type Charge = (
  feature: "reasoning" | "search" | "fetch" | "stt_seconds" | "tts_chars",
  amount?: number,
) => Promise<void>;
