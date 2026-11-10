// Local testing is opt-in and must never activate through a hosted origin.
export function localSessionAllowed(
  appUrl: string,
  requestHeaders: Headers,
  hosted: boolean,
) {
  if (hosted) return false;
  const url = new URL(appUrl);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return false;
  if (requestHeaders.get("host") !== url.host) return false;
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (forwardedHost && forwardedHost !== url.host) return false;
  if (requestHeaders.has("forwarded")) return false;
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (
    forwardedFor &&
    !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(forwardedFor.trim())
  )
    return false;
  return true;
}
