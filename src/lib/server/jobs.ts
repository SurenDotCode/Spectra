import "server-only";
import { z } from "zod";
import { adminDb } from "./admin";
import { reasoning, search, chargeFor } from "./providers";
import { rate, redis } from "./guard";
import { SafeFetchProvider } from "../security/safe-fetch";
import {
  ResearchPipeline,
  researchDataSchema,
  investigationSchema,
  key,
  domain,
  dedupe,
} from "../research/core";
import { qualify } from "../research/verify";
import { sourceSchema } from "../schemas";
import { AppError } from "../errors";
import { ProviderDeferred } from "../providers/deferred";
const jobSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  stage: z.number(),
  data: researchDataSchema,
  lease_token: z.uuid(),
  attempts: z.number(),
});
const itemSchema = z.object({
  item_key: z.string(),
  status: z.string(),
  attempts: z.number(),
  next_attempt_at: z.string(),
  data: z.unknown(),
});
export async function tick(id?: string) {
  const db = adminDb();
  const { data: claimed, error: claimError } = await db.rpc("claim_search", {
    p_id: id ?? null,
  });
  if (claimError) throw claimError;
  const rows = z.array(jobSchema).parse(claimed);
  if (!rows.length) return;
  const job = rows[0];
  const charge = chargeFor(job.user_id);
  const fetcher = new SafeFetchProvider(async (d) => {
    await rate(`crawl:${d}`, 10);
    await charge("fetch");
  });
  const cachedFetcher = {
    fetch: async (url: string) => {
      const cacheKey = key(url);
      const { data: hit } = await db
        .from("research_cache")
        .select("data,expires_at")
        .eq("user_id", job.user_id)
        .eq("cache_key", cacheKey)
        .maybeSingle();
      if (hit && new Date(hit.expires_at).getTime() > Date.now())
        return sourceSchema.parse(hit.data);
      const source = await fetcher.fetch(url);
      const { error } = await db.from("research_cache").upsert(
        {
          user_id: job.user_id,
          cache_key: cacheKey,
          data: source,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
        { onConflict: "user_id,cache_key" },
      );
      if (error) throw error;
      return source;
    },
  };
  const searcher = search(job.user_id);
  const cachedSearch = {
    search: async (query: string) => {
      const cacheKey = `spectra:search:${job.user_id}:${key(query)}`;
      const hit = await redis().get(cacheKey);
      if (hit) return z.array(sourceSchema).parse(hit);
      const result = await searcher.search(query);
      await redis().set(cacheKey, result, { ex: 3600 });
      return result;
    },
  };
  const pipeline = new ResearchPipeline(
    reasoning(job.user_id),
    cachedSearch,
    cachedFetcher,
  );
  let data = {
    ...job.data,
    retryAt: undefined as number | undefined,
    reason: "",
  };
  let stage = job.stage;
  let state = "queued";
  let attempts = job.attempts;
  async function release() {
    const { error } = await db
      .from("searches")
      .update({
        data,
        stage,
        status: state,
        attempts,
        lease_until: data.retryAt ? new Date(data.retryAt).toISOString() : null,
        lease_token: null,
      })
      .eq("id", job.id)
      .eq("user_id", job.user_id)
      .eq("lease_token", job.lease_token);
    if (error) throw error;
  }
  async function items(s: number) {
    const { data: result, error } = await db
      .from("search_stages")
      .select("item_key,status,attempts,next_attempt_at,data")
      .eq("search_id", job.id)
      .eq("user_id", job.user_id)
      .eq("stage", s);
    if (error) throw error;
    return z.array(itemSchema).parse(result);
  }
  async function work(itemKey: string, action: () => Promise<unknown>) {
    const existing = (await items(stage)).find((x) => x.item_key === itemKey);
    if (existing?.status === "completed" || (existing?.attempts ?? 0) >= 2)
      return true;
    if (existing && new Date(existing.next_attempt_at).getTime() > Date.now())
      return false;
    try {
      const result = await action();
      const { error } = await db.from("search_stages").upsert(
        {
          user_id: job.user_id,
          search_id: job.id,
          stage,
          item_key: itemKey,
          status: "completed",
          attempts: (existing?.attempts ?? 0) + 1,
          data: result,
        },
        { onConflict: "search_id,stage,item_key" },
      );
      if (error) throw error;
    } catch (error) {
      if (error instanceof ProviderDeferred) throw error;
      if (
        error instanceof AppError &&
        ["QUOTA", "BUDGET", "REASONING_LIMIT", "REASONING_KEY"].includes(
          error.code,
        )
      )
        throw error;
      const attempts = (existing?.attempts ?? 0) + 1;
      const { error: writeError } = await db.from("search_stages").upsert(
        {
          user_id: job.user_id,
          search_id: job.id,
          stage,
          item_key: itemKey,
          status: "failed",
          attempts,
          next_attempt_at: new Date(
            Date.now() + attempts * 10000,
          ).toISOString(),
          data: {
            error:
              error instanceof AppError
                ? error.message
                : "This item could not be researched.",
            code: error instanceof AppError ? error.code : "INTERNAL",
          },
        },
        { onConflict: "search_id,stage,item_key" },
      );
      if (writeError) throw writeError;
    }
    return false;
  }
  try {
    if (stage === 0) {
      if (!data.queries.length) {
        data = {
          ...data,
          queries: await pipeline.plan(
            data.offer,
            data.feedback,
            data.previousQueries,
          ),
        };
      } else {
        const list = await items(0);
        const pending = data.queries.find(
          (q) =>
            !list.some(
              (x) =>
                x.item_key === key(q) &&
                (x.status === "completed" || x.attempts >= 2),
            ),
        );
        if (pending) await work(key(pending), () => pipeline.discover(pending));
        else {
          const sources = list
            .filter(
              (x) =>
                x.status === "completed" &&
                data.queries.some((q) => key(q) === x.item_key),
            )
            .flatMap((x) => z.array(sourceSchema).parse(x.data));
          data = {
            ...data,
            discoverySources: [
              ...new Map(
                [...data.discoverySources, ...sources].map((s) => [s.url, s]),
              ).values(),
            ],
            candidates: dedupe([
              ...data.candidates,
              ...(await pipeline.candidates(data.offer, sources, [
                ...data.excluded,
                ...data.candidates.map((c) => domain(c.url)),
              ])),
            ]).slice(0, 30),
          };
          stage = 1;
        }
      }
    } else if (stage === 1) {
      const list = await items(1);
      const supported = list
        .filter((x) => x.status === "completed")
        .map((x) => investigationSchema.parse(x.data))
        .filter((x) =>
          qualify(x.candidate, x.assessment, x.sources, crypto.randomUUID()),
        );
      const pending =
        supported.length >= 5
          ? undefined
          : data.candidates.find(
              (c) =>
                !list.some(
                  (x) =>
                    x.item_key === domain(c.url) &&
                    (x.status === "completed" || x.attempts >= 2),
                ),
            );
      if (pending)
        await work(domain(pending.url), () =>
          pipeline.investigate(pending, data.offer, data.discoverySources),
        );
      else if (
        supported.length < 5 &&
        data.discoveryRound < 2 &&
        data.candidates.length < 30
      ) {
        data = {
          ...data,
          discoveryRound: data.discoveryRound + 1,
          previousQueries: [
            ...new Set([...data.previousQueries, ...data.queries]),
          ],
          queries: [],
          reason: `Found ${supported.length} qualified prospects so far. Searching additional relevant businesses (round ${data.discoveryRound + 2} of 3).`,
        };
        stage = 0;
      } else stage = 2;
    } else if (stage === 2) {
      const investigated = (await items(1))
        .filter((x) => x.status === "completed")
        .map((x) => investigationSchema.parse(x.data));
      const best = investigated
        .filter((x) =>
          qualify(x.candidate, x.assessment, x.sources, crypto.randomUUID()),
        )
        .sort((a, b) => {
          const left = qualify(a.candidate, a.assessment, a.sources, "rank")!;
          const right = qualify(b.candidate, b.assessment, b.sources, "rank")!;
          return (
            right.score - left.score || left.domain.localeCompare(right.domain)
          );
        })
        .slice(0, 5);
      const list = await items(2);
      const pending = best.find(
        (c) =>
          !list.some(
            (x) =>
              x.item_key === domain(c.candidate.url) &&
              (x.status === "completed" || x.attempts >= 2),
          ),
      );
      if (pending)
        await work(domain(pending.candidate.url), async () => {
          try {
            const enriched = await pipeline.contacts(
              pending.candidate,
              data.offer,
              pending.sources,
              pending.assessment,
            );
            return {
              ...pending,
              sources: enriched.sources,
              assessment: {
                ...pending.assessment,
                contacts: enriched.assessment.contacts,
                people: enriched.assessment.people,
              },
            };
          } catch (error) {
            if (!(error instanceof AppError) || error.code !== "QUOTA")
              throw error;
            // Extra contact enrichment is optional; never discard a supported
            // prospect just because the remaining daily allowance is exhausted.
            data = { ...data, contactLimited: true };
            return pending;
          }
        });
      else stage = 3;
    } else {
      const investigated = (await items(1))
        .filter((x) => x.status === "completed")
        .map((x) => investigationSchema.parse(x.data));
      const contacts = (await items(2))
        .filter((x) => x.status === "completed")
        .map((x) => investigationSchema.parse(x.data));
      const ranked = investigated
        .map((x) => {
          const contact = contacts.find(
            (c) => domain(c.candidate.url) === domain(x.candidate.url),
          );
          return contact
            ? {
                ...x,
                sources: [
                  ...new Map(
                    [...x.sources, ...contact.sources].map((s) => [s.url, s]),
                  ).values(),
                ],
                assessment: {
                  ...x.assessment,
                  contacts: contact.assessment.contacts,
                  people: contact.assessment.people,
                },
              }
            : x;
        })
        .map((x) =>
          qualify(x.candidate, x.assessment, x.sources, crypto.randomUUID()),
        )
        .filter((x) => x !== null)
        .sort((a, b) => b.score - a.score || a.domain.localeCompare(b.domain))
        .slice(0, 5);
      const rejected = investigated.filter(
        (x) => x.assessment.buyerRole && x.assessment.buyerRole !== "buyer",
      );
      if (rejected.length) {
        const { data: previous, error } = await db
          .from("businesses")
          .select("id,data,domain")
          .eq("search_id", job.id)
          .eq("user_id", job.user_id);
        if (error) throw error;
        for (const row of previous ?? []) {
          const corrected = rejected.find(
            (x) => domain(x.candidate.url) === row.domain,
          );
          if (!corrected) continue;
          const { error: updateError } = await db
            .from("businesses")
            .update({ data: { ...row.data, assessment: corrected.assessment } })
            .eq("id", row.id)
            .eq("user_id", job.user_id);
          if (updateError) throw updateError;
        }
      }
      for (const prospect of ranked) {
        const { error } = await db.rpc("save_prospect", {
          p_user: job.user_id,
          p_search: job.id,
          p_prospect: prospect,
        });
        if (error) throw error;
      }
      const failedItems = (await items(1)).filter(
        (x) => x.status === "failed",
      ).length;
      data = {
        ...data,
        reason:
          ranked.length < 5
            ? `Found ${data.discoverySources.length} search results and ${data.candidates.length} candidate businesses. ${failedItems} candidate lookups failed. ${investigated.length - ranked.length} assessed candidates did not pass evidence and fit checks. Returned ${ranked.length} supported prospects.`
            : "Five prospects met the evidence and fit threshold.",
      };
      if (data.contactLimited)
        data.reason +=
          " Additional contact lookups reached the daily allowance; existing evidence and contacts were preserved.";
      stage = 4;
      state = "completed";
    }
  } catch (error) {
    if (error instanceof ProviderDeferred) {
      data = { ...data, retryAt: error.retryAt, reason: error.message };
      state = "queued";
      await release();
      return;
    }
    if (!(
      error instanceof AppError &&
      ["QUOTA", "BUDGET", "REASONING_LIMIT"].includes(error.code)
    ))
      attempts++;
    state =
      error instanceof AppError &&
      ["QUOTA", "BUDGET", "REASONING_LIMIT"].includes(error.code)
        ? "quota"
        : "failed";
    data = {
      ...data,
      reason:
        error instanceof AppError
          ? error.message
          : state === "quota"
            ? "Research paused at the usage limit. Completed work is saved."
            : "Research paused after an error. Resume to retry the unfinished step.",
    };
    console.error(
      JSON.stringify({
        event: "research_paused",
        searchId: job.id,
        stage,
        code: error instanceof AppError ? error.code : "INTERNAL",
      }),
    );
  }
  await release();
}
