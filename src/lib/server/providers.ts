import "server-only";
import { env } from "./env";
import { assertAccountEnabled } from "./audit";
import { adminDb } from "./admin";
import { AppError } from "../errors";
import {
  EvonProvider,
  CompatibleReasoningProvider,
} from "../providers/reasoning";
import { PrismaProvider, TimbreProvider } from "../providers/gnani";
import { TavilySearchProvider } from "../providers/search";
import type { Charge } from "../providers/interfaces";
import { reserveReasoning } from "./reasoning-queue";
export function chargeFor(userId: string): Charge {
  return async (feature, amount = 1) => {
    const e = env();
    await assertAccountEnabled(userId);
    if (
      e.GLOBAL_KILL_SWITCH === "true" ||
      e.PROVIDER_BUDGET_CONFIRMED !== "true"
    )
      throw new AppError(
        "BUDGET",
        429,
        "Provider use is paused until the owner confirms available credit and budget caps.",
      );
    const { data, error } = await adminDb().rpc("reserve_usage", {
      p_user: userId,
      p_feature: feature,
      p_amount: amount,
    });
    if (error) throw error;
    if (data !== true)
      throw new AppError(
        "QUOTA",
        429,
        "The daily quota has been reached. Your completed research is saved.",
      );
  };
}
export function reasoning(userId: string) {
  const e = env();
  if (e.REASONING_PROVIDER === "evon") return new EvonProvider();
  if (
    e.FALLBACK_APPROVED !== "true" ||
    !e.FALLBACK_BASE_URL ||
    !e.FALLBACK_API_KEY ||
    !e.FALLBACK_MODEL
  )
    throw new AppError(
      "FALLBACK_DISABLED",
      503,
      "Reasoning is not connected. No automatic fallback is enabled.",
    );
  return new CompatibleReasoningProvider(
    {
      baseURL: e.FALLBACK_BASE_URL,
      apiKey: e.FALLBACK_API_KEY,
      model: e.FALLBACK_MODEL,
      approved: true,
    },
    chargeFor(userId),
    fetch,
    reserveReasoning,
  );
}
export function speech(userId: string) {
  const e = env();
  if (!e.GNANI_API_KEY)
    throw new AppError(
      "GNANI_SETUP",
      503,
      "Gnani voice is not connected. Use the text alternative.",
    );
  return {
    stt: new PrismaProvider(e.GNANI_API_KEY, chargeFor(userId)),
    tts: new TimbreProvider(
      e.GNANI_API_KEY,
      e.GNANI_VOICE_ID ?? "Kaveri",
      chargeFor(userId),
    ),
  };
}
export function search(userId: string) {
  const e = env();
  if (!e.TAVILY_API_KEY)
    throw new AppError(
      "SEARCH_SETUP",
      503,
      "Configure the search provider before starting research.",
    );
  return new TavilySearchProvider(e.TAVILY_API_KEY, chargeFor(userId));
}
