import { it, expect } from "vitest";
import { redact } from "../src/lib/security/logging";
import { readFileSync } from "node:fs";
it("redacts nested credentials, audio, notes and common personal contact data", () => {
  const result = JSON.stringify(
    redact({
      password: "abc",
      nested: { note: "private", token: "secret" },
      message: "Reach user@example.com",
    }),
  );
  expect(result).not.toContain("abc");
  expect(result).not.toContain("private");
  expect(result).not.toContain("user@example.com");
});
it("keeps privileged credentials behind server-only imports", () => {
  const admin = readFileSync("src/lib/server/admin.ts", "utf8");
  expect(admin).toMatch(/import ["']server-only["']/);
  expect(admin).toContain("SUPABASE_SERVICE_ROLE_KEY");
  const client = readFileSync("src/lib/client-api.ts", "utf8");
  expect(client).not.toContain("process.env");
});
