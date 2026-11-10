import { z } from "zod";
import type { Assessment, Candidate, Source, Prospect } from "../schemas";
import { domain } from "./core";
import { cleanContacts } from "./contacts";
const normalized = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();
export function verifyAssessment(
  assessment: Assessment,
  sources: Source[],
  candidate: Candidate,
): Assessment {
  const stored = new Map(sources.map((s) => [s.url, s]));
  const observations = assessment.observations.filter((o) => {
    const s = stored.get(o.sourceUrl);
    return s && normalized(s.text).includes(normalized(o.quote));
  });
  const contacts = cleanContacts(assessment.contacts)
    .filter((c) => {
      const s = stored.get(c.sourceUrl);
      if (!s || domain(s.url) !== domain(candidate.url)) return false;
      const included =
        c.channel === "form" || c.channel === "social"
          ? s.links.includes(c.value) || s.url === c.value
          : normalized(s.text).includes(normalized(c.value));
      if (!included) return false;
      if (c.channel === "email" && !z.email().safeParse(c.value).success)
        return false;
      if (
        (c.channel === "phone" || c.channel === "whatsapp") &&
        (!/^[+()0-9 .-]+$/.test(c.value) ||
          c.value.replace(/\D/g, "").length < 7 ||
          c.value.replace(/\D/g, "").length > 15)
      )
        return false;
      if (c.channel === "whatsapp") {
        const index = normalized(s.text).indexOf(normalized(c.value));
        return /whatsapp/i.test(
          s.text.slice(Math.max(0, index - 100), index + c.value.length + 100),
        );
      }
      return true;
    })
    .map((c) => ({ ...c, checkedAt: stored.get(c.sourceUrl)!.fetchedAt }));
  const people = assessment.people
    .filter((p) => {
      const s = stored.get(p.sourceUrl);
      if (
        !s ||
        !/^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%\-]+\/?$/.test(
          p.linkedin,
        )
      )
        return false;
      return (
        (s.url === p.linkedin || s.links.includes(p.linkedin)) &&
        normalized(s.text).includes(normalized(p.affiliationQuote)) &&
        normalized(p.affiliationQuote).includes(normalized(p.name))
      );
    })
    .map((p) => ({
      ...p,
      role: normalized(p.affiliationQuote).includes(normalized(p.role))
        ? p.role
        : "Not found",
      confirmed:
        domain(p.sourceUrl) === domain(candidate.url) &&
        normalized(p.affiliationQuote).includes(normalized(p.role)),
    }));
  const integrations = assessment.integrations.filter((integration) =>
    observations.some(
      (o) =>
        normalized(o.quote).includes(normalized(integration)) &&
        !/\b(no|not|without|never)\b/i.test(o.quote),
    ),
  );
  return { ...assessment, observations, contacts, people, integrations };
}
export function qualify(
  candidate: Candidate,
  assessment: Assessment,
  sources: Source[],
  id: string,
): Prospect | null {
  const a = verifyAssessment(assessment, sources, candidate);
  const brandKey = (value: string) =>
    normalized(value).replace(/[^a-z0-9]/g, "");
  const candidateDomain = domain(candidate.url);
  const supportedName = sources.some(
    (s) =>
      normalized(s.text + " " + s.title).includes(normalized(candidate.name)) ||
      (domain(s.url) === candidateDomain &&
        brandKey(candidate.name).length >= 4 &&
        brandKey(candidate.name) ===
          brandKey(candidateDomain.split(".").slice(0, -1).join("."))),
  );
  if (
    (a.buyerRole !== undefined && a.buyerRole !== "buyer") ||
    !supportedName ||
    !a.observations.length ||
    a.fit < 3 ||
    !a.serviceable ||
    a.skipReasons.length
  )
    return null;
  const evidence = Math.min(3, a.observations.length) * 7;
  const fit = a.fit * 12;
  const penalty = Math.min(4, a.mismatches.length) * 5;
  return {
    ...candidate,
    location: sources.some((s) =>
      normalized(s.text).includes(normalized(candidate.location)),
    )
      ? candidate.location
      : "Not found",
    industry: `${candidate.industry} (inferred)`,
    id,
    domain: domain(candidate.url),
    assessment: a,
    sources,
    score: Math.max(0, Math.min(100, fit + evidence + 15 - penalty)),
    factors: [
      `Product relevance: ${fit}/60 (model assessment)`,
      `Supported observations: ${evidence}/21`,
      `No known serviceability blocker: 15/15`,
      `Known mismatch penalty: −${penalty}`,
    ],
    status: "new",
    checkedAt: sources.reduce(
      (date, s) => (s.fetchedAt > date ? s.fetchedAt : date),
      "",
    ),
  };
}
