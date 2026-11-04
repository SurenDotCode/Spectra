import { z } from "zod";
export async function api<T>(
  path: string,
  payload: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  const tokenResponse = await fetch("/api/csrf");
  const { token } = z
    .object({ token: z.string() })
    .parse(await tokenResponse.json());
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": token },
    body: JSON.stringify(payload),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const e = z.object({ error: z.string() }).safeParse(data);
    throw new Error(e.success ? e.data.error : "Request failed.");
  }
  return schema.parse(data);
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
