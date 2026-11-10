import { z } from "zod";
export async function api<T>(
  path: string,
  payload: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    signal?.throwIfAborted();
    const tokenResponse = await fetch("/api/csrf", { signal });
    const { token } = z
      .object({ token: z.string() })
      .parse(await tokenResponse.json());
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": token },
      body: JSON.stringify(payload),
      signal,
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      const waiting = z
        .object({ code: z.literal("PROVIDER_WAIT"), retryAt: z.number() })
        .safeParse(data);
      if (waiting.success && attempt < 4) {
        await new Promise<void>((resolve, reject) => {
          const abort = () => {
            clearTimeout(timer);
            reject(new DOMException("Cancelled", "AbortError"));
          };
          const timer = setTimeout(
            () => {
              signal?.removeEventListener("abort", abort);
              resolve();
            },
            Math.max(1000, Math.min(300000, waiting.data.retryAt - Date.now())),
          );
          signal?.addEventListener("abort", abort, { once: true });
          if (signal?.aborted) abort();
        });
        continue;
      }
      const e = z.object({ error: z.string() }).safeParse(data);
      throw new Error(e.success ? e.data.error : "Request failed.");
    }
    return schema.parse(data);
  }
  throw new Error(
    "Provider capacity is temporarily unavailable. Your input is preserved.",
  );
}
export async function readApi<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const r = await fetch(path);
  const data: unknown = await r.json();
  if (!r.ok) {
    const e = z.object({ error: z.string() }).safeParse(data);
    throw new Error(e.success ? e.data.error : "Request failed.");
  }
  return schema.parse(data);
}
