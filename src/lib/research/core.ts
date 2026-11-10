import { createHash } from "node:crypto";
import { z } from "zod";
import { AppError } from "../errors";
import { evidenceExcerpt } from "./evidence";
import { publicContacts } from "./contacts";
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
  retryAt: z.number().optional(),
  excluded: z.array(z.string()).default([]),
  feedback: z.array(z.string()).default([]),
  discoveryRound: z.number().int().min(0).max(2).default(0),
  previousQueries: z.array(z.string()).default([]),
  contactLimited: z.boolean().default(false),
});
export type ResearchData = z.infer<typeof researchDataSchema>;
export class ResearchPipeline {
  constructor(
    private reasoning: ReasoningProvider,
    private search: SearchProvider,
    private fetcher: FetchProvider,
  ) {}
  async plan(offer: Offer, feedback: string[], previousQueries: string[] = []) {
    return (
      await this.reasoning.generate(
        "Create exactly 3 short web discovery queries of 3-6 words each to find BUYERS of the offer, not vendors selling it. Search for customers' observable activities. Follow offer.customers: include agencies when the user targets agencies, as well as brands when requested. Agencies using outreach internally can be buyers, not automatically competitors. For influencer outreach, search creator/ambassador programmes and influencer campaign management services as appropriate. Do not require words like English or use restrictive site:.in filters. For scope both: one query uses the supplied location and two search worldwide without that location. For worldwide: omit local location; for nearby: use location. Respect explicit country restrictions. Use at most one quoted phrase per query. Search for the exact language a buyer website uses, such as skincare ambassador program or fashion creator program, rather than generic terms like global consumer brands or international outreach initiative. Choose concrete buyer sectors appropriate to the offer. Do not include the literal words global, worldwide, international, or consumer brands just to express scope. Missing pricing or integrations must not block discovery. Feedback is user-reported, not verified.",
        {
          offer,
          feedback,
          previousQueries,
          instruction:
            "Previous queries produced too few qualified prospects. When previousQueries is nonempty, choose different relevant buyer sectors, programme terms or customer types rather than repeating them. Respect the original geography; do not silently broaden a nearby-only search.",
        },
        z.object({ queries: z.array(z.string().max(400)).length(3) }).strict(),
      )
    ).queries;
  }
  discover(query: string) {
    return this.search.search(query);
  }
  async candidates(offer: Offer, sources: Source[], excluded: string[]) {
    const result = await this.reasoning.generate(
      "Choose up to 20 plausible BUYERS of this offer, not competing vendors, directories or listicles. Respect the intended customer types in offer.customers. Include agencies when requested; they may buy automation for client campaigns. Do not exclude an agency merely because it performs influencer outreach. Every candidate URL must be exactly one supplied search result URL. Only use location/industry supported by snippets; otherwise Not found. Missing pricing or integrations are unknowns, not rejection reasons. Return fewer when evidence is thin.",
      {
        offer,
        sources: sources.map((s) => ({
          ...s,
          text: s.text.slice(0, 600),
          links: [],
        })),
      },
      z.object({ candidates: z.array(candidateSchema).max(20) }).strict(),
    );
    const urls = new Set(sources.map((s) => s.url));
    return dedupe(
      result.candidates.filter((c) => {
        if (!urls.has(c.url)) return false;
        const name = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const source = sources.find((s) => s.url === c.url)!;
        // A brand mentioned inside a directory is not the directory's owner.
        return (
          name.length > 0 &&
          (source.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .includes(name) ||
            domain(c.url)
              .replace(/[^a-z0-9]/g, "")
              .includes(name))
        );
      }),
      excluded,
    );
  }
  async investigate(
    candidate: Candidate,
    offer: Offer,
    discovery: Source[] = [],
  ) {
    const sources: Source[] = [];
    try {
      sources.push(await this.fetcher.fetch(candidate.url));
    } catch (error) {
      if (error instanceof AppError && ["QUOTA", "BUDGET"].includes(error.code))
        throw error;
      // A blocked page may still have usable public search evidence. Preserve
      // its search provenance; never pretend the page itself was fetched.
      sources.push(...discovery.filter((s) => s.url === candidate.url));
      if (!sources.length) throw error;
    }
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
  async contacts(
    candidate: Candidate,
    offer: Offer,
    sources: Source[],
    base?: Assessment,
  ) {
    const all = [...sources];
    const urls = [
      ...new Set(
        sources
          .flatMap((s) => s.links)
          .filter((u) => {
            try {
              return (
                domain(u) === domain(candidate.url) &&
                /contact|about|team/i.test(new URL(u).pathname)
              );
            } catch {
              return false;
            }
          }),
      ),
    ].slice(0, 2);
    if (!urls.length) urls.push(new URL("/contact", candidate.url).href);
    for (const url of urls) {
      if (all.some((s) => s.url === url)) continue;
      try {
        all.push(await this.fetcher.fetch(url));
      } catch (e) {
        if (e instanceof AppError && ["QUOTA", "BUDGET"].includes(e.code))
          throw e;
      }
    }
    if (!publicContacts(candidate.url, all).length) {
      const extra = await this.search.search(
        `site:${domain(candidate.url)} contact email partnerships`,
      );
      all.push(...extra);
      const page = extra.find(
        (s) =>
          domain(s.url) === domain(candidate.url) &&
          !sources.some((old) => old.url === s.url),
      );
      if (page)
        try {
          all.push(await this.fetcher.fetch(page.url));
        } catch (e) {
          if (e instanceof AppError && ["QUOTA", "BUDGET"].includes(e.code))
            throw e;
        }
    }
    const unique = new Map<string, Source>();
    for (const source of all) {
      const old = unique.get(source.url);
      if (
        !old ||
        (source.kind === "page" && old.kind !== "page") ||
        (source.kind === old.kind && source.text.length >= old.text.length)
      )
        unique.set(source.url, source);
    }
    const contactSources = [...unique.values()];
    const assessment =
      base ?? (await this.assess(candidate, offer, contactSources));
    return {
      candidate,
      sources: contactSources,
      assessment: {
        ...assessment,
        contacts: [
          ...new Map(
            [
              ...assessment.contacts,
              ...publicContacts(candidate.url, contactSources),
            ].map((c) => [c.channel + c.value, c]),
          ).values(),
        ].slice(0, 12),
      },
    };
  }
  async assess(
    candidate: Candidate,
    offer: Offer,
    sources: Source[],
  ): Promise<Assessment> {
    return this.reasoning.generate(
      "Assess plausible fit, not buying intent. Keep output compact: at most 3 observations, 2 inferences, 3 unknowns, 2 mismatches and 2 skipReasons. Each prose field must be under 350 characters. Return contacts and people as empty arrays here; a separate contact-page reader handles them. Always classify buyerRole. buyer means the company itself has the target workflow or provides client services requiring it. competitor means it sells software delivering the same core capability as the offer; reject it even when the page describes the right workflow. publisher means it merely publishes advice or lists about the target customers, with no evidence it performs that workflow itself. unknown means its own workflow is unestablished. Only buyer can qualify. For competitor/publisher/unknown use fit 0-2 and explain the rejection in skipReasons. Do not confuse a platform's customers with the platform itself. Agencies explicitly targeted by the user may qualify from their client services, but competing software platforms must not. Return direct verbatim quotes as observations, each with an EXACT stored source URL. Quotes MUST be one continuous substring copied from source.text, 10-500 characters: never combine title and text, shorten with ellipses, paraphrase, or alter punctuation. Prefer short 20-150 character quotes. Never call an inference verified. Score fit 0-5 for workflow relevance: 0-1 unrelated or contradictory, 2 vague relevance without supported target activity, 3 supported target activity and plausible use of the offered capability, 4 strong explicit workflow alignment, 5 multiple strong indicators. Unknown budget, existing tools, integrations or purchase intent must NOT reduce workflow relevance. A consumer brand is a valid SaaS buyer when it has the target workflow; being outside the software industry is not a mismatch. serviceable requires no KNOWN language, market, pricing or integration blocker. Missing information is an unknown, NOT a blocker or skip reason. Search snippets are limited evidence: mention that limitation when no page was readable. Public contacts must occur verbatim in a source; do not generate email addresses. WhatsApp requires an explicit WhatsApp label. Form/social/LinkedIn URLs must occur in source links or search result URL. LinkedIn evidence is only a public snippet or company-page link. Do not infer current employment from a URL alone. Leave lists empty rather than guess. Write a concise qualification question for the prospect, not a prerequisite for the user.",
      {
        offer,
        candidate,
        sources: sources.slice(0, 5).map((s) => ({
          ...s,
          text: evidenceExcerpt(s.text, offer).slice(0, 1800),
          links: s.links.slice(0, 8),
        })),
      },
      assessmentSchema.extend({
        buyerRole: z.enum(["buyer", "competitor", "publisher", "unknown"]),
      }),
    );
  }
}
