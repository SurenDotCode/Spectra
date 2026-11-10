import { expect, it, vi } from "vitest";
import { z } from "zod";
import { CompatibleReasoningProvider } from "../src/lib/providers/reasoning";

const config = {
  approved: true,
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: "gsk_test_only",
  model: "openai/gpt-oss-120b",
};

it("sends the schema to Groq and validates its response through the real SDK", async () => {
  const request = vi.fn<typeof fetch>(async (url, init) => {
    expect(String(url)).toBe("https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe(config.model);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(false);
    expect(body.response_format.json_schema.schema.properties.answer.type).toBe(
      "string",
    );
    expect(body.reasoning_effort).toBe("low");
    return Response.json({
      id: "test-completion",
      object: "chat.completion",
      created: 1,
      model: config.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: '{"answer":"Unknown"}' },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
  });
  const charge = vi.fn(async () => {});
  const result = await new CompatibleReasoningProvider(
    config,
    charge,
    request,
  ).generate(
    "Assess evidence",
    {},
    z.object({ answer: z.string(), note: z.string().optional() }),
  );
  expect(result).toEqual({ answer: "Unknown" });
  expect(charge).toHaveBeenCalledTimes(1);
});

it("blocks missing or old OpenAI keys before charging or making a request", async () => {
  const request = vi.fn<typeof fetch>();
  const charge = vi.fn(async () => {});
  await expect(
    new CompatibleReasoningProvider(
      { ...config, apiKey: "PASTE_GROQ_API_KEY_HERE" },
      charge,
      request,
    ).generate("test", {}, z.object({})),
  ).rejects.toThrow("Paste your Groq API key");
  expect(request).not.toHaveBeenCalled();
  expect(charge).not.toHaveBeenCalled();
});

it.each([429, 413, 401, 403])(
  "reports provider status %s without retry or paid failover",
  async (status) => {
    const request = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { message: "Test error", type: "test_error" } },
        { status },
      ),
    );
    await expect(
      new CompatibleReasoningProvider(config, async () => {}, request).generate(
        "test",
        {},
        z.object({}),
      ),
    ).rejects.toThrow(
      status === 429
        ? "continue automatically"
        : status === 413
          ? "limit"
          : "key was rejected",
    );
    expect(request).toHaveBeenCalledTimes(1);
  },
);
