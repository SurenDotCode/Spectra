import { createHash } from "node:crypto";
import { z } from "zod";
import {
  candidateSchema,
  sourceSchema,
  assessmentSchema,
  offerSchema,
  type Candidate,
  type Source,
  type Offer,
  type Assessment,
} from "../schemas";
import type {
  ReasoningProvider,
  SearchProvider,
  FetchProvider,
} from "../providers/interfaces";
export function domain(value: string) {
  return new URL(value).hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}
export function dedupe(candidates: Candidate[], seen: string[] = []) {
  const domains = new Set(seen);
  const names = new Set<string>();
  return candidates.filter((c) => {
    const d = domain(c.url);
    const n = c.name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    if (domains.has(d) || names.has(n)) return false;
    domains.add(d);
    names.add(n);
    return true;
  });
}
export function key(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
export const investigationSchema = z.object({
  candidate: candidateSchema,
  sources: z.array(sourceSchema),
  assessment: assessmentSchema,
});
export const researchDataSchema = z.object({
  offer: offerSchema,
  queries: z.array(z.string()).default([]),
  candidates: z.array(candidateSchema).default([]),
  discoverySources: z.array(sourceSchema).default([]),
  reason: z.string().default(""),
  excluded: z.array(z.string()).default([]),
  feedback: z.array(z.string()).default([]),
});
export type ResearchData = z.infer<typeof researchDataSchema>;
export class ResearchPipeline {
  constructor(
    private reasoning: ReasoningProvider,
    private search: SearchProvider,
    private fetcher: FetchProvider,
  ) {}
  async plan(offer: Offer, feedback: string[]) {
    return (
      await this.reasoning.generate(
        "Create exactly 3 different web discovery queries aimed at direct business websites with observable activity relevant to this offer. Include geography and language constraints. Exclude vendors selling the same solution. Feedback is user-reported, not verified.",
        { offer, feedback },
        z.object({ queries: z.array(z.string().max(400)).length(3) }).strict(),
      )
    ).queries;
  }
  discover(query: string) {
    return this.search.search(query);
  }
  async candidates(offer: Offer, sources: Source[], excluded: string[]) {
    const result = await this.reasoning.generate(
      "Choose up to 20 plausible business candidates, not directories or listicles. Every candidate URL must be exactly one supplied search result URL. Only use location/industry supported by snippets; otherwise Not found. Return fewer when evidence is thin.",
      { offer, sources },
      z.object({ candidates: z.array(candidateSchema).max(20) }).strict(),
    );
    const urls = new Set(sources.map((s) => s.url));
    return dedupe(
      result.candidates.filter((c) => urls.has(c.url)),
      excluded,
    );
  }
  async investigate(candidate: Candidate, offer: Offer) {
    const sources: Source[] = [await this.fetcher.fetch(candidate.url)];
    const links = sources[0].links
      .filter(
        (u) =>
          domain(u) === domain(candidate.url) &&
          /about|services|collab|creator|partner|career|contact/i.test(u),
      )
      .slice(0, 2);
    for (const link of links) {
      try {
        sources.push(await this.fetcher.fetch(link));
      } catch {
        continue;
      }
    }
    return {
      candidate,
      sources,
      assessment: await this.assess(candidate, offer, sources),
    };
  }
  async contacts(candidate: Candidate, offer: Offer, sources: Source[]) {
    const extra = await this.search.search(
      `site:${domain(candidate.url)} contact team partnerships founder LinkedIn`,
    );
    const all = [...sources, ...extra];
    return {
      candidate,
      sources: all,
      assessment: await this.assess(candidate, offer, all),
    };
  }
  async assess(
    candidate: Candidate,
    offer: Offer,
    sources: Source[],
  ): Promise<Assessment> {
    return this.reasoning.generate(
      "Assess plausible fit, not buying intent. Return direct verbatim quotes as observations, each with an EXACT stored source URL. Never call an inference verified. Score fit 0-5 based on observed relevant activity. serviceable requires no known language, market, pricing or integration blocker. Mark missing details unknown. Public contacts must occur verbatim in a source; do not generate email addresses. WhatsApp requires an explicit WhatsApp label. Form/social/LinkedIn URLs must occur in source links or search result URL. LinkedIn evidence is only a public snippet or company-page link. Do not infer current employment from a URL alone. Leave lists empty rather than guess. Write a concise qualification question.",
      { offer, candidate, sources },
      assessmentSchema,
    );
  }
}
