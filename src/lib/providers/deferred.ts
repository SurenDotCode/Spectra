import { AppError } from "../errors";

export class ProviderDeferred extends AppError {
  constructor(public readonly retryAt: number) {
    super(
      "PROVIDER_WAIT",
      429,
      "Research is waiting for free provider capacity and will continue automatically.",
    );
  }
}

export function providerRetryAt(
  headers: Record<string, string> = {},
  now = Date.now(),
) {
  const retry = headers["retry-after"];
  if (retry && Number.isFinite(Number(retry)))
    return now + Math.max(1000, Number(retry) * 1000) + 1000;
  if (retry && Number.isFinite(Date.parse(retry)))
    return Math.max(now + 1000, Date.parse(retry)) + 1000;
  return now + 65000;
}
