import { expect, it, vi } from "vitest";
import {
  ProviderDeferred,
  providerRetryAt,
} from "../src/lib/providers/deferred";
import { CompatibleReasoningProvider } from "../src/lib/providers/reasoning";
import { z } from "zod";

it("honors numeric and date Retry-After, with a safe fallback", () => {
  const now = 1700000000000;
  expect(providerRetryAt({ "retry-after": "12" }, now)).toBe(now + 13000);
  expect(
    providerRetryAt(
      { "retry-after": new Date(now + 60000).toUTCString() },
      now,
    ),
  ).toBe(now + 61000);
  expect(providerRetryAt({}, now)).toBe(now + 65000);
  expect(providerRetryAt({ "retry-after": "bad" }, now)).toBe(now + 65000);
});
it("waits before charging or calling a provider when shared capacity is reserved", async () => {
  const charge = vi.fn(async () => {});
  const request = vi.fn<typeof fetch>();
  const reserve = vi.fn(async () => {
    throw new ProviderDeferred(Date.now() + 20000);
  });
  const p = new CompatibleReasoningProvider(
    {
      approved: true,
      baseURL: "https://api.groq.com/openai/v1",
      model: "openai/gpt-oss-120b",
      apiKey: "gsk_test_only",
    },
    charge,
    request,
    reserve,
  );
  await expect(p.generate("test", {}, z.object({}))).rejects.toBeInstanceOf(
    ProviderDeferred,
  );
  expect(charge).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
});
it("preserves provider retry timing without retrying immediately", async () => {
  const request = vi.fn<typeof fetch>(async () =>
    Response.json(
      { error: { message: "rate limited", type: "rate_limit" } },
      { status: 429, headers: { "retry-after": "42" } },
    ),
  );
  const p = new CompatibleReasoningProvider(
    {
      approved: true,
      baseURL: "https://api.groq.com/openai/v1",
      model: "openai/gpt-oss-120b",
      apiKey: "gsk_test_only",
    },
    async () => {},
    request,
  );
  const before = Date.now();
  const error = await p.generate("test", {}, z.object({})).catch((e) => e);
  expect(error).toBeInstanceOf(ProviderDeferred);
  expect(error.retryAt).toBeGreaterThanOrEqual(before + 43000);
  expect(request).toHaveBeenCalledTimes(1);
});
