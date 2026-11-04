import { NextRequest, NextResponse } from "next/server";
import { securityHeaders } from "./lib/security/headers";
import { parseEnv } from "./lib/env";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const headers = new Headers(request.headers);
  const secure = securityHeaders(nonce);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", secure["Content-Security-Policy"]);
  let response = NextResponse.next({ request: { headers } });
  const e = parseEnv(process.env);
  if (
    e.SPECTRA_MODE === "live" &&
    e.UPSTASH_REDIS_REST_URL &&
    e.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      const limiter = new Ratelimit({
        redis: new Redis({
          url: e.UPSTASH_REDIS_REST_URL,
          token: e.UPSTASH_REDIS_REST_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(600, "1 m"),
        prefix: "spectra:perimeter",
      });
      if (!(await limiter.limit("global")).success)
        response = NextResponse.json(
          { error: "Traffic limit reached. Try again shortly." },
          { status: 429 },
        );
    } catch {
      response = NextResponse.json(
        { error: "Request protection is temporarily unavailable." },
        { status: 503 },
      );
    }
  }
  for (const [k, v] of Object.entries(secure)) response.headers.set(k, v);
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
