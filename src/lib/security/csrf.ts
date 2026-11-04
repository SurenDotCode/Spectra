import { timingSafeEqual } from "node:crypto";
import { AppError } from "../errors";
export function verifyCsrf(
  origin: string | null,
  expected: string,
  token: string | null,
  cookie: string | undefined,
) {
  if (
    origin !== new URL(expected).origin ||
    !token ||
    !cookie ||
    !/^[a-f0-9]{64}$/.test(token) ||
    token.length !== cookie.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(cookie))
  )
    throw new AppError(
      "CSRF",
      403,
      "This request could not be authorized. Reload the page and try again.",
    );
}
