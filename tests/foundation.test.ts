import { describe, it, expect } from "vitest";
import { parseEnv } from "../src/lib/env";
import { securityHeaders } from "../src/lib/security/headers";
describe("foundation", () => {
  it("allows explicit unconnected setup and fails closed in live mode", () => {
    expect(parseEnv({}).SPECTRA_MODE).toBe("setup");
    expect(() => parseEnv({ SPECTRA_MODE: "live" })).toThrow("SUPABASE_URL");
  });
  it("requires explicit fallback configuration", () => {
    expect(() => parseEnv({ FALLBACK_APPROVED: "true" })).toThrow(
      "FALLBACK_BASE_URL",
    );
  });
  it("has strict nonce CSP and anti-framing headers", () => {
    const h = securityHeaders("abc");
    expect(h["Content-Security-Policy"]).toContain("'nonce-abc'");
    expect(h["Content-Security-Policy"]).not.toMatch(
      /unsafe-inline|unsafe-eval/,
    );
    expect(h["X-Frame-Options"]).toBe("DENY");
  });
});
