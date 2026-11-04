import { matchesGeography } from "./geography";
import { z } from "zod";
import type { Prospect } from "./schemas";
export const conversationReplySchema = z.object({
  answer: z.string(),
  focusIds: z.array(z.uuid()),
  action: z.enum(["answer", "clarify", "skip", "feedback", "filter"]),
  country: z.string().optional(),
  excludeAgencies: z.boolean().optional(),
  integration: z.string().optional(),
  needsResearch: z.boolean().default(false),
});
export type ConversationReply = z.infer<typeof conversationReplySchema>;
export function resolveReferences(
  text: string,
  list: Prospect[],
  focused?: string,
  previous?: string,
) {
  const q = text.toLowerCase();
  if (/previous company|previous one/.test(q))
    return previous ? list.filter((p) => p.id === previous) : [];
  const ordinals = ["first", "second", "third", "fourth", "fifth"];
  const explicit = ordinals.flatMap((word, i) =>
    new RegExp(`\\b${word}\\b`).test(q) && list[i] ? [list[i]] : [],
  );
  if (explicit.length) return explicit;
  const byName = list.filter(
    (p) =>
      q.includes(p.name.toLowerCase()) ||
      p.location
        .split(/[, ]+/)
        .some((word) => word.length > 3 && q.includes(word.toLowerCase())),
  );
  if (byName.length) return byName;
  if (/these two|compare/.test(q) && list.length === 2) return list;
  if (focused) return list.filter((p) => p.id === focused);
  return list.length === 1 ? list : [];
}
const sentence = (text: string, max = 105) =>
  text.length > max ? text.slice(0, max).replace(/\s+\S*$/, "") + "…" : text;
export function discuss(
  text: string,
  list: Prospect[],
  focused?: string,
  previous?: string,
): ConversationReply {
  const q = text.toLowerCase();
  const refs = resolveReferences(text, list, focused, previous);
  const ids = refs.map((p) => p.id);
  const excludeAgencies = /exclude agencies|no agencies/.test(q);
  const country = q.match(
    /(?:search|only|in) (?:the )?(uk|united kingdom|india|usa|united states|canada|australia)\b/,
  );
  if (country) {
    const region = country[1] === "uk" ? "UK" : country[1];
    const available = list.some(
      (p) =>
        matchesGeography(p.location, region) &&
        (!excludeAgencies || !/agency/i.test(p.assessment.businessType)),
    );
    return {
      answer: available
        ? `Showing existing matches for ${region}. No new research was needed.`
        : `The current batch has no confirmed ${region} matches. Update the offer’s countries and confirm a new search to research that market.`,
      focusIds: [],
      action: "filter",
      country: region,
      excludeAgencies: excludeAgencies || undefined,
      needsResearch: !available,
    };
  }
  if (excludeAgencies)
    return {
      answer: "Agencies are excluded from the current board.",
      focusIds: [],
      action: "filter",
      excludeAgencies: true,
      needsResearch: false,
    };
  if (/only.*gmail/.test(q)) {
    const available = list.some((p) =>
      p.assessment.integrations.some((x) => /gmail/i.test(x)),
    );
    return {
      answer: available
        ? "Showing prospects with recorded Gmail integration evidence. A Gmail address alone does not prove workflow compatibility."
        : "Gmail usage is not established in the current evidence. No prospects will be labeled compatible without support.",
      focusIds: [],
      action: "filter",
      integration: "gmail",
      needsResearch: !available,
    };
  }
  if (!refs.length || (!/compare/.test(q) && refs.length > 1))
    return {
      answer:
        "Which prospect do you mean? Use its name or its displayed number.",
      focusIds: [],
      action: "clarify",
      needsResearch: false,
    };
  if (/compare/.test(q)) {
    if (refs.length !== 2)
      return {
        answer:
          "Which two prospects should I compare? Say “the first and second,” for example.",
        focusIds: ids,
        action: "clarify",
        needsResearch: false,
      };
    return {
      answer: `${refs[0].name}: ${sentence(refs[0].assessment.inferences[0] ?? refs[0].assessment.explanation, 140)} ${refs[1].name}: ${sentence(refs[1].assessment.inferences[0] ?? refs[1].assessment.explanation, 140)} Confirm their existing workflow before choosing either.`,
      focusIds: ids,
      action: "answer",
      needsResearch: false,
    };
  }
  const p = refs[0];
  const a = p.assessment;
  if (/skip|dismiss/.test(q))
    return {
      answer: `${p.name} has been dismissed. It will be excluded from future discovery.`,
      focusIds: ids,
      action: "skip",
      needsResearch: false,
    };
  if (/already (use|uses|have|has)|they told|they said/.test(q))
    return {
      answer: `Saved your feedback about ${p.name} as user-reported. It will inform later discovery without changing the public evidence.`,
      focusIds: ids,
      action: "feedback",
      needsResearch: false,
    };
  if (/who.*contact/.test(q)) {
    const person = a.people[0],
      contact = a.contacts[0];
    return {
      answer: person
        ? `${person.name} is listed as ${person.role}; ${person.confirmed ? "company-page evidence supports that affiliation" : "current affiliation is unconfirmed"}. ${sentence(person.reason)} Confirm the role before approaching them.`
        : contact
          ? `No relevant person was verified. The publicly listed ${contact.channel} is ${contact.value}; ask who owns this workflow.`
          : "No person or direct contact was found. Check the business website for a public contact channel.",
      focusIds: ids,
      action: "answer",
      needsResearch: false,
    };
  }
  if (/what.*ask|question|opening/.test(q))
    return {
      answer: `Start by qualifying their need: “${a.question}” Public activity alone does not establish a need for your solution.`,
      focusIds: ids,
      action: "answer",
      needsResearch: false,
    };
  if (/pros|cons|advantage|concern/.test(q))
    return {
      answer: `Potential advantage: ${sentence(a.inferences[0] ?? a.explanation)} Main concern: ${sentence(a.mismatches[0] ?? a.unknowns[0] ?? "Their need and current workflow remain unknown.")} ${sentence(a.question)}`,
      focusIds: ids,
      action: "answer",
      needsResearch: false,
    };
  if (/more|detail/.test(q))
    return {
      answer: [
        a.explanation,
        ...a.inferences,
        ...a.mismatches,
        ...a.unknowns,
        a.question,
      ]
        .join(" ")
        .slice(0, 2000),
      focusIds: ids,
      action: "answer",
      needsResearch: false,
    };
  if (/think|worth|fit|tell me|brief/.test(q))
    return {
      answer: `Worth exploring: ${sentence(a.inferences[0] ?? a.explanation)} ${sentence(a.unknowns[0] ?? "The existing workflow is unknown.")} ${sentence(a.question)}`,
      focusIds: ids,
      action: "answer",
      needsResearch: false,
    };
  return {
    answer:
      "That information is not established in the stored evidence. Ask about fit, concerns, contacts, or qualification questions, or run a refined search for missing information.",
    focusIds: ids,
    action: "answer",
    needsResearch: true,
  };
}
