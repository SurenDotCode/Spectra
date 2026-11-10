import type { Offer } from "../schemas";

// Preserve exact source substrings while finding relevant text beyond headers,
// menus and product listings. The verifier still checks against the full source.
export function evidenceExcerpt(text: string, offer: Offer, limit = 2500) {
  if (text.length <= limit) return text;
  const terms = new Set(
    `${offer.purpose} ${offer.problem} ${offer.customers} ${offer.capabilities.join(" ")}`
      .toLowerCase()
      .match(/[\p{L}\p{N}]{5,}/gu) ?? [],
  );
  for (const word of [
    "specified",
    "unknown",
    "automated",
    "automation",
    "marketing",
    "their",
    "which",
    "would",
  ])
    terms.delete(word);
  if ([...terms].some((term) => /influencer|creator/.test(term))) {
    for (const term of ["ambassador", "creator", "collaborat", "partnership"])
      terms.add(term);
  }
  const pieces: { start: number; text: string; score: number }[] = [];
  for (let start = 0; start < text.length; start += 350) {
    const part = text.slice(start, start + 450);
    const lower = part.toLowerCase();
    const score = [...terms].filter((term) => lower.includes(term)).length;
    pieces.push({ start, text: part, score });
  }
  const selected = pieces
    .sort((a, b) => b.score - a.score || a.start - b.start)
    .slice(0, 5)
    .sort((a, b) => a.start - b.start);
  return selected
    .map((p) => p.text)
    .join("\n\n")
    .slice(0, limit);
}
