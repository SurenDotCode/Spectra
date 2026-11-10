import "server-only";
import { redis } from "./guard";
import { ProviderDeferred } from "../providers/deferred";

// Shared across users and Node workers. Each reservation spaces the next call
// by its conservative input + output budget, below Groq's 8K TPM free tier.
export async function reserveReasoning(tokens: number) {
  const now = Date.now();
  const interval = Math.ceil((Math.min(8000, tokens) * 60000) / 6500);
  const retryAt = Number(
    await redis().eval(
      `local next = tonumber(redis.call('GET', KEYS[1]) or '0')
     local now = tonumber(ARGV[1])
     if next > now then return next end
     redis.call('SET', KEYS[1], now + tonumber(ARGV[2]), 'PX', tonumber(ARGV[2]) + 1000)
     return 0`,
      ["spectra:groq:capacity"],
      [now, interval],
    ),
  );
  if (retryAt > now) throw new ProviderDeferred(retryAt);
  return async (actualTokens: number) => {
    const next = now + Math.ceil((actualTokens * 60000) / 6500);
    await redis().eval(
      `if tonumber(redis.call('GET', KEYS[1]) or '0') == tonumber(ARGV[1]) then
         local ttl = tonumber(ARGV[2]) - tonumber(ARGV[3])
         if ttl > 0 then redis.call('SET', KEYS[1], ARGV[2], 'PX', ttl + 1000)
         else redis.call('DEL', KEYS[1]) end
       end
       return 1`,
      ["spectra:groq:capacity"],
      [now + interval, next, Date.now()],
    );
  };
}
