import { z } from "zod";
export const short = z.string().max(1500);
export const safeUrl = z.url().refine((v) => {
  const u = new URL(v);
  return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password;
}, "Public HTTP(S) URL required");
export const offerSchema = z
  .object({
    purpose: short,
    problem: short,
    capabilities: z.array(short).max(12),
    integrations: z.array(short).max(12),
    pricing: short,
    limitations: z.array(short).max(12),
    customers: short,
    location: short,
    countries: z.array(short).max(12),
    languages: z.array(short).max(12),
    industry: short,
    businessSize: short,
    scope: z.enum(["nearby", "worldwide", "both"]),
  })
  .strict();
export type Offer = z.infer<typeof offerSchema>;
export const sourceSchema = z
  .object({
    url: safeUrl,
    title: short,
    text: z.string().max(50000),
    fetchedAt: z.iso.datetime(),
    kind: z.enum(["page", "search"]),
    links: z.array(safeUrl).max(100),
  })
  .strict();
export type Source = z.infer<typeof sourceSchema>;
export const candidateSchema = z
  .object({
    name: z.string().min(1).max(150),
    url: safeUrl,
    location: short,
    industry: short,
  })
  .strict();
export type Candidate = z.infer<typeof candidateSchema>;
export const observationSchema = z
  .object({ quote: z.string().min(10).max(500), sourceUrl: safeUrl })
  .strict();
export const contactSchema = z
  .object({
    channel: z.enum(["email", "phone", "whatsapp", "form", "social"]),
    value: z.string().min(1).max(500),
    sourceUrl: safeUrl,
    checkedAt: z.iso.datetime(),
  })
  .strict();
export const personSchema = z
  .object({
    name: short,
    role: short,
    linkedin: safeUrl,
    reason: short,
    affiliationQuote: short,
    sourceUrl: safeUrl,
    confirmed: z.boolean(),
  })
  .strict();
export const assessmentSchema = z
  .object({
    observations: z.array(observationSchema).max(8),
    inferences: z.array(short).max(5),
    unknowns: z.array(short).max(5),
    mismatches: z.array(short).max(5),
    skipReasons: z.array(short).max(5),
    question: short,
    explanation: short,
    industry: short,
    location: short,
    businessType: short,
    integrations: z.array(short).max(10),
    fit: z.number().int().min(0).max(5),
    serviceable: z.boolean(),
    contacts: z.array(contactSchema).max(12),
    people: z.array(personSchema).max(5),
  })
  .strict();
export type Assessment = z.infer<typeof assessmentSchema>;
export const prospectSchema = candidateSchema.extend({
  id: z.uuid(),
  domain: z.string(),
  assessment: assessmentSchema,
  sources: z.array(sourceSchema),
  score: z.number(),
  factors: z.array(short),
  status: z.enum(["new", "saved", "dismissed", "contacted"]).default("new"),
  checkedAt: z.iso.datetime(),
});
export type Prospect = z.infer<typeof prospectSchema>;
