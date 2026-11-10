import { it, expect } from "vitest";
import type { z } from "zod";
import { ResearchPipeline } from "../src/lib/research/core";
import type { ReasoningProvider } from "../src/lib/providers/interfaces";
import { offerSchema, type Source, assessmentSchema } from "../src/lib/schemas";
const offer = offerSchema.parse({
  purpose: "Creator email follow-ups",
  problem: "Manual follow-ups",
  capabilities: ["Email"],
  integrations: ["Gmail"],
  pricing: "₹1,000/month",
  limitations: [],
  customers: "Brands",
  location: "Pune",
  countries: ["India"],
  languages: ["English"],
  industry: "Retail",
  businessSize: "Small",
  scope: "both",
});
const source: Source = {
  url: "https://fixture.example/creators",
  title: "Fixture",
  text: "Fixture invites creators to collaborate.",
  fetchedAt: "2026-11-03T00:00:00.000Z",
  kind: "search",
  links: [],
};
const assessment = assessmentSchema.parse({
  buyerRole: "buyer",
  observations: [{ quote: source.text, sourceUrl: source.url }],
  inferences: ["Potential fit"],
  unknowns: ["Current workflow"],
  mismatches: [],
  skipReasons: [],
  question: "How are follow-ups managed?",
  explanation: "Plausible fit.",
  industry: "Retail",
  location: "Pune",
  businessType: "Brand",
  integrations: [],
  fit: 4,
  serviceable: true,
  contacts: [],
  people: [],
});
class FixtureReasoning implements ReasoningProvider {
  readonly name = "test-fixture";
  async generate<T>(task: string, data: unknown, schema: z.ZodType<T>) {
    if (task.startsWith("Create"))
      return schema.parse({
        queries: [
          "creator programme India",
          "brand collaboration Pune",
          "creator partnership contact",
        ],
      });
    if (task.startsWith("Choose"))
      return schema.parse({
        candidates: [
          {
            name: "Fixture",
            url: source.url,
            location: "Pune",
            industry: "Retail",
          },
          {
            name: "Invented",
            url: "https://invented.example",
            location: "Unknown",
            industry: "Unknown",
          },
        ],
      });
    void data;
    return schema.parse(assessment);
  }
}
it("executes discovery, investigation and contact lookup with provider contracts", async () => {
  const pipeline = new ResearchPipeline(
    new FixtureReasoning(),
    { search: async () => [source] },
    { fetch: async () => ({ ...source, kind: "page" }) },
  );
  const queries = await pipeline.plan(offer, [
    "User-reported: focus on brands",
  ]);
  expect(queries).toHaveLength(3);
  const sources = await pipeline.discover(queries[0]);
  const candidates = await pipeline.candidates(offer, sources, []);
  expect(candidates).toHaveLength(1);
  expect(
    await pipeline.candidates(offer, sources, ["fixture.example"]),
  ).toHaveLength(0);
  const investigated = await pipeline.investigate(candidates[0], offer);
  expect(investigated.sources[0].kind).toBe("page");
  const contacts = await pipeline.contacts(
    candidates[0],
    offer,
    investigated.sources,
  );
  expect(contacts.sources.some((s) => s.url === source.url)).toBe(true);
});

it("keeps search provenance when a page cannot be fetched", async () => {
  const pipeline = new ResearchPipeline(
    new FixtureReasoning(),
    { search: async () => [source] },
    {
      fetch: async () => {
        throw new Error("Page unavailable");
      },
    },
  );
  const candidate = {
    name: "Fixture",
    url: source.url,
    location: "Pune",
    industry: "Retail",
  };
  const result = await pipeline.investigate(candidate, offer, [source]);
  expect(result.sources).toEqual([source]);
  expect(result.sources[0].kind).toBe("search");
  await expect(pipeline.investigate(candidate, offer, [])).rejects.toThrow(
    "Page unavailable",
  );
});

it("does not hide a usage pause behind search evidence", async () => {
  const { AppError } = await import("../src/lib/errors");
  const pipeline = new ResearchPipeline(
    new FixtureReasoning(),
    { search: async () => [source] },
    {
      fetch: async () => {
        throw new AppError("QUOTA", 429, "Usage paused");
      },
    },
  );
  await expect(
    pipeline.investigate(
      {
        name: "Fixture",
        url: source.url,
        location: "Pune",
        industry: "Retail",
      },
      offer,
      [source],
    ),
  ).rejects.toThrow("Usage paused");
});
it("reads contact pages without another reasoning call and verifies published email", async () => {
  const pipeline = new ResearchPipeline(
    {
      name: "unused",
      generate: async () => {
        throw Error("Unexpected model call");
      },
    },
    {
      search: async () => {
        throw Error("Unnecessary search");
      },
    },
    {
      fetch: async (url) => ({
        ...source,
        url,
        kind: "page",
        text: "Contact: partnerships@fixture.example",
        links: [],
      }),
    },
  );
  const result = await pipeline.contacts(
    { name: "Fixture", url: source.url, location: "Pune", industry: "Retail" },
    offer,
    [{ ...source, links: ["https://fixture.example/contact"] }],
    assessment,
  );
  expect(
    result.assessment.contacts.some(
      (c) => c.value === "partnerships@fixture.example",
    ),
  ).toBe(true);
  expect(result.assessment.fit).toBe(assessment.fit);
});
it("retains a full contact page when search returns a shorter snippet for the same URL", async () => {
  const contact = {
    ...source,
    url: "https://fixture.example/contact",
    kind: "page" as const,
    text: "Contact partnerships@fixture.example",
  };
  const pipeline = new ResearchPipeline(
    new FixtureReasoning(),
    {
      search: async () => [{ ...contact, kind: "search", text: "Contact us" }],
    },
    { fetch: async () => contact },
  );
  const result = await pipeline.contacts(
    { name: "Fixture", url: source.url, location: "Pune", industry: "Retail" },
    offer,
    [source],
    assessment,
  );
  expect(result.sources.filter((s) => s.url === contact.url)).toHaveLength(1);
  expect(result.sources.find((s) => s.url === contact.url)?.text).toContain(
    "partnerships@fixture.example",
  );
  expect(result.assessment.contacts.map((c) => c.value)).toContain(
    "partnerships@fixture.example",
  );
});
