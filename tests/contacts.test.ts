import { it, expect } from "vitest";
import { publicContacts } from "../src/lib/research/contacts";
import type { Source } from "../src/lib/schemas";
it("extracts published contacts but excludes third-party evidence and sharing URLs", () => {
  const s: Source = {
    url: "https://brand.example/contact",
    title: "Contact",
    kind: "page",
    text: "Email hello@brand.example. Phone: +44 1234567890",
    links: ["https://instagram.com/brand", "https://facebook.com/sharer"],
    fetchedAt: "2026-11-09T00:00:00.000Z",
  };
  const contacts = publicContacts(s.url, [
    s,
    { ...s, url: "https://other.example", text: "fake@brand.example" },
  ]);
  expect(contacts.map((c) => c.value)).toContain("hello@brand.example");
  expect(contacts.map((c) => c.value)).toContain("+44 1234567890");
  expect(contacts.map((c) => c.value)).not.toContain("fake@brand.example");
  expect(contacts).toHaveLength(3);
});
it("does not turn joined HTML labels into additional emails or social posts into contacts", () => {
  const s: Source = {
    url: "https://brand.example/contact",
    title: "Contact",
    kind: "page",
    text: "Hellohello@brand.exampleServices hello@brand.example",
    links: ["https://instagram.com/p/123", "https://instagram.com/brand"],
    fetchedAt: "2026-11-09T00:00:00.000Z",
  };
  expect(publicContacts(s.url, [s]).map((c) => c.value)).toEqual([
    "hello@brand.example",
    "https://instagram.com/brand",
  ]);
});
