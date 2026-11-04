import { it, expect } from "vitest";
import { discuss, resolveReferences } from "../src/lib/conversation";
import type { Prospect } from "../src/lib/schemas";
function prospect(name: string, location: string): Prospect {
  return {
    id: crypto.randomUUID(),
    name,
    location,
    url: "https://fixture.example",
    domain: "fixture.example",
    industry: "Retail",
    score: 70,
    status: "new",
    checkedAt: "2026-11-03T00:00:00.000Z",
    sources: [],
    factors: [],
    assessment: {
      observations: [],
      inferences: ["They invite creators."],
      unknowns: ["Current software is unknown."],
      mismatches: [],
      skipReasons: [],
      question: "How do you handle follow-ups?",
      explanation: "Plausible fit.",
      industry: "Retail",
      location,
      businessType: "Brand",
      integrations: [],
      fit: 4,
      serviceable: true,
      contacts: [],
      people: [],
    },
  };
}
it("resolves stable ordinal and previous references without reordering", () => {
  const a = prospect("One", "Pune"),
    b = prospect("Two", "London"),
    list = [a, b];
  expect(resolveReferences("first and second", list).map((x) => x.id)).toEqual([
    a.id,
    b.id,
  ]);
  expect(
    resolveReferences("the previous company", list, b.id, a.id)[0].id,
  ).toBe(a.id);
  expect(list.map((x) => x.name)).toEqual(["One", "Two"]);
});
it("clarifies ambiguous location references", () => {
  const list = [prospect("One", "Pune"), prospect("Two", "Pune")];
  expect(discuss("What about that Pune brand?", list).action).toBe("clarify");
});
it("uses evidence for concise answers and marks missing facts", () => {
  const p = prospect("One", "Pune");
  expect(discuss("pros and cons", [p], p.id).answer).toContain(
    "Current software",
  );
  expect(
    discuss("What is their annual revenue?", [p], p.id).needsResearch,
  ).toBe(true);
});
it("maps refinements and feedback to explicit actions", () => {
  const p = prospect("One", "Pune");
  expect(discuss("skip this one", [p], p.id).action).toBe("skip");
  expect(discuss("They already use outreach software", [p], p.id).action).toBe(
    "feedback",
  );
  expect(discuss("Search the UK", [p], p.id).needsResearch).toBe(true);
  expect(discuss("Exclude agencies", [p]).excludeAgencies).toBe(true);
});

it("applies combined country and agency refinements", () => {
  const result = discuss("Exclude agencies and search the UK", [
    prospect("One", "London"),
  ]);
  expect(result.country).toBe("UK");
  expect(result.excludeAgencies).toBe(true);
  expect(result.needsResearch).toBe(false);
});
