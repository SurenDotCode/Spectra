import "server-only";
import { z } from "zod";
import { adminDb } from "./admin";
import { reasoning, search, chargeFor } from "./providers";
import { rate } from "./guard";
import { SafeFetchProvider } from "../security/safe-fetch";
import {
  ResearchPipeline,
  researchDataSchema,
  investigationSchema,
  key,
  domain,
} from "../research/core";
import { qualify } from "../research/verify";
import { sourceSchema } from "../schemas";
import { AppError } from "../errors";
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
  const pipeline = new ResearchPipeline(
    reasoning(job.user_id),
    search(job.user_id),
    cachedFetcher,
  );
  let data = job.data;
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
        lease_until: null,
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
      if (error instanceof AppError && ["QUOTA", "BUDGET"].includes(error.code))
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
          data: { error: "This item could not be researched." },
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
          queries: await pipeline.plan(data.offer, data.feedback),
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
            .filter((x) => x.status === "completed")
            .flatMap((x) => z.array(sourceSchema).parse(x.data));
          data = {
            ...data,
            discoverySources: sources,
            candidates: await pipeline.candidates(
              data.offer,
              sources,
              data.excluded,
            ),
          };
          stage = 1;
        }
      }
    } else if (stage === 1) {
      const list = await items(1);
      const pending = data.candidates.find(
        (c) =>
          !list.some(
            (x) =>
              x.item_key === domain(c.url) &&
              (x.status === "completed" || x.attempts >= 2),
          ),
      );
      if (pending)
        await work(domain(pending.url), () =>
          pipeline.investigate(pending, data.offer),
        );
      else stage = 2;
    } else if (stage === 2) {
      const investigated = (await items(1))
        .filter((x) => x.status === "completed")
        .map((x) => investigationSchema.parse(x.data));
      const best = investigated
        .filter((x) =>
          qualify(x.candidate, x.assessment, x.sources, crypto.randomUUID()),
        )
        .sort((a, b) => b.assessment.fit - a.assessment.fit)
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
        await work(domain(pending.candidate.url), () =>
          pipeline.contacts(pending.candidate, data.offer, pending.sources),
        );
      else stage = 3;
    } else {
      const investigated = (await items(1))
        .filter((x) => x.status === "completed")
        .map((x) => investigationSchema.parse(x.data));
      const contacts = (await items(2))
        .filter((x) => x.status === "completed")
        .map((x) => investigationSchema.parse(x.data));
      const ranked = investigated
        .map(
          (x) =>
            contacts.find(
              (c) => domain(c.candidate.url) === domain(x.candidate.url),
            ) ?? x,
        )
        .map((x) =>
          qualify(x.candidate, x.assessment, x.sources, crypto.randomUUID()),
        )
        .filter((x) => x !== null)
        .sort((a, b) => b.score - a.score || a.domain.localeCompare(b.domain))
        .slice(0, 5);
      for (const prospect of ranked) {
        const { error } = await db.rpc("save_prospect", {
          p_user: job.user_id,
          p_search: job.id,
          p_prospect: prospect,
        });
        if (error) throw error;
      }
      data = {
        ...data,
        reason:
          ranked.length < 5
            ? `Returned ${ranked.length} prospects: other candidates lacked sufficient source support, had fit concerns, or could not be researched.`
            : "Five prospects met the evidence and fit threshold.",
      };
      stage = 4;
      state = "completed";
    }
  } catch (error) {
    if (!(
      error instanceof AppError && ["QUOTA", "BUDGET"].includes(error.code)
    ))
      attempts++;
    state =
      error instanceof AppError && ["QUOTA", "BUDGET"].includes(error.code)
        ? "quota"
        : "failed";
    data = {
      ...data,
      reason:
        state === "quota"
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
