import { expect, test } from "vitest";
import { localSessionAllowed } from "../src/lib/security/local-session";
import { parseEnv } from "../src/lib/env";

test("local session is disabled by default and needs dedicated credentials", () => {
  expect(parseEnv({}).LOCAL_AUTO_SIGN_IN).toBe("false");
  expect(() => parseEnv({ LOCAL_AUTO_SIGN_IN: "true" })).toThrow();
  expect(() =>
    parseEnv({
      LOCAL_AUTO_SIGN_IN: "true",
      LOCAL_TEST_EMAIL: "test@example.test",
      LOCAL_TEST_PASSWORD: "x".repeat(40),
      APP_URL: "https://spectra.example",
    }),
  ).toThrow();
});
test("local sessions reject hosted, wrong-port and forwarded remote requests", () => {
  const headers = new Headers({ host: "127.0.0.1:3000" });
  expect(localSessionAllowed("http://127.0.0.1:3000", headers, false)).toBe(
    true,
  );
  expect(localSessionAllowed("http://127.0.0.1:3000", headers, true)).toBe(
    false,
  );
  expect(localSessionAllowed("http://127.0.0.1:3001", headers, false)).toBe(
    false,
  );
  expect(
    localSessionAllowed(
      "https://spectra.example",
      new Headers({ host: "spectra.example" }),
      false,
    ),
  ).toBe(false);
  const cases: Record<string, string>[] = [
    { "x-forwarded-host": "spectra.example" },
    { "x-forwarded-for": "203.0.113.1" },
    { forwarded: "for=203.0.113.1" },
  ];
  for (const extra of cases) {
    expect(
      localSessionAllowed(
        "http://127.0.0.1:3000",
        new Headers({ host: "127.0.0.1:3000", ...extra }),
        false,
      ),
    ).toBe(false);
  }
});
