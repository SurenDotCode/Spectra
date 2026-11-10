import { it, expect } from "vitest";
import { evidenceExcerpt } from "../src/lib/research/evidence";
import type { Offer } from "../src/lib/schemas";
const offer = {
  purpose: "Influencer outreach",
  problem: "Manual creator outreach",
  customers: "Brands and agencies",
  capabilities: ["Influencer email outreach"],
} as Offer;
it("keeps relevant exact source text beyond a long navigation menu", () => {
  const relevant =
    "Our influencer programme invites creators to collaborate with our skincare brand.";
  const text =
    "Shop products menu categories checkout basket. ".repeat(160) +
    relevant +
    " Product listings. ".repeat(160);
  const excerpt = evidenceExcerpt(text, offer);
  expect(excerpt.length).toBeLessThanOrEqual(2500);
  expect(excerpt).toContain(relevant);
  for (const chunk of excerpt.split("\n\n")) expect(text).toContain(chunk);
});
it("preserves short evidence and does not invent absent content", () => {
  expect(evidenceExcerpt("No information published.", offer)).toBe(
    "No information published.",
  );
});
