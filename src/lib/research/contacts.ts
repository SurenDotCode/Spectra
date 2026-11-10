import { z } from "zod";
import type { Assessment, Source } from "../schemas";

export function cleanContacts(
  contacts: Assessment["contacts"],
): Assessment["contacts"] {
  return contacts.filter((c) => {
    if (c.channel === "email")
      return !contacts.some(
        (other) =>
          other.channel === "email" &&
          other.value.length < c.value.length &&
          c.value.toLowerCase().includes(other.value.toLowerCase()),
      );
    if (c.channel === "social") {
      try {
        return !/share|sharer|intent|^\/(p|reel|reels|stories|status|posts)\//.test(
          new URL(c.value).pathname,
        );
      } catch {
        return false;
      }
    }
    return true;
  });
}

// Only public details from the company's own pages. Never guess email patterns.
export function publicContacts(
  url: string,
  sources: Source[],
): Assessment["contacts"] {
  const host = (value: string) => new URL(value).hostname.replace(/^www\./, "");
  const own = host(url);
  const contacts: Assessment["contacts"] = [];
  for (const source of sources) {
    if (host(source.url) !== own) continue;
    const add = (
      channel: Assessment["contacts"][number]["channel"],
      value: string,
    ) => {
      if (!contacts.some((c) => c.channel === channel && c.value === value))
        contacts.push({
          channel,
          value,
          sourceUrl: source.url,
          checkedAt: source.fetchedAt,
        });
    };
    const emailText = source.text.includes("Published email links:")
      ? source.text.split("Published email links:").at(-1)!
      : source.text;
    const emails =
      emailText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    for (const value of emails)
      if (
        z.email().safeParse(value).success &&
        !emails.some(
          (other) =>
            other.length < value.length &&
            value.toLowerCase().includes(other.toLowerCase()),
        ) &&
        !/\.(png|jpg|webp)$/i.test(value)
      )
        add("email", value);
    for (const match of source.text.matchAll(
      /(?:phone|tel(?:ephone)?|call)\s*:?\s*(\+?[\d(][\d () .-]{6,24}\d)/gi,
    ))
      if (match[1].replace(/\D/g, "").length >= 7)
        add("phone", match[1].trim());
    for (const link of source.links) {
      try {
        const target = new URL(link);
        if (link === source.url && /contact/i.test(target.pathname))
          add("form", link);
        if (
          /^(www\.)?(linkedin\.com|instagram\.com|facebook\.com|x\.com)$/.test(
            target.hostname,
          ) &&
          target.pathname.length > 1 &&
          !/share|sharer|intent|^\/(p|reel|reels|stories|status|posts)\//.test(
            target.pathname,
          )
        )
          add("social", link);
      } catch {
        /* Ignore malformed source links. */
      }
    }
  }
  return contacts
    .sort(
      (a, b) => Number(b.channel === "email") - Number(a.channel === "email"),
    )
    .slice(0, 12);
}
