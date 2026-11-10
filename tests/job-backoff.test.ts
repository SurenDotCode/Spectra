import { expect, it, vi } from "vitest";
import { ProviderDeferred } from "../src/lib/providers/deferred";
const state = vi.hoisted(() => ({
  update: vi.fn(),
  select: vi.fn(),
  rpc: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/server/admin", () => ({
  adminDb: () => ({
    rpc: state.rpc,
    from: () => ({ update: state.update, select: state.select }),
  }),
}));
vi.mock("../src/lib/server/guard", () => ({ rate: async () => {} }));
vi.mock("../src/lib/server/providers", () => ({
  reasoning: () => ({ name: "test", generate: state.generate }),
  search: () => ({ search: async () => [] }),
  chargeFor: () => async () => {},
}));
import { tick } from "../src/lib/server/jobs";
it("checkpoints a throttled job and resumes the same work without consuming attempts", async () => {
  const id = crypto.randomUUID(),
    user_id = crypto.randomUUID();
  const offer = {
    purpose: "Outreach",
    problem: "Manual work",
    customers: "Brands",
    capabilities: [],
    integrations: [],
    pricing: "Unknown",
    limitations: [],
    location: "Pune",
    countries: [],
    languages: ["English"],
    industry: "Unknown",
    businessSize: "Unknown",
    scope: "both",
  };
  const job = {
    id,
    user_id,
    stage: 0,
    attempts: 0,
    lease_token: crypto.randomUUID(),
    data: {
      offer,
      queries: [],
      candidates: [],
      discoverySources: [],
      excluded: [],
      feedback: [],
      reason: "",
    },
  };
  state.rpc.mockResolvedValue({ data: [job], error: null });
  const chain = {
    eq: vi.fn(),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ error: null }).then(resolve),
  };
  chain.eq.mockReturnValue(chain);
  state.update.mockReturnValue(chain);
  const retryAt = Date.now() + 60000;
  state.generate.mockRejectedValueOnce(new ProviderDeferred(retryAt));
  await tick(id);
  expect(state.update).toHaveBeenLastCalledWith(
    expect.objectContaining({
      status: "queued",
      stage: 0,
      attempts: 0,
      lease_until: new Date(retryAt).toISOString(),
      data: expect.objectContaining({ retryAt }),
    }),
  );
  state.generate.mockResolvedValueOnce({ queries: ["a", "b", "c"] });
  await tick(id);
  expect(state.update).toHaveBeenLastCalledWith(
    expect.objectContaining({
      status: "queued",
      attempts: 0,
      lease_until: null,
      data: expect.objectContaining({
        queries: ["a", "b", "c"],
        retryAt: undefined,
      }),
    }),
  );
});

it.each([
  { round: 0, nextRound: 1, nextStage: 0 },
  { round: 2, nextRound: 2, nextStage: 2 },
])(
  "expands a short batch within the bounded discovery budget: round $round",
  async ({ round, nextRound, nextStage }) => {
    const offer = {
      purpose: "Outreach",
      problem: "Manual work",
      customers: "Brands and agencies",
      capabilities: [],
      integrations: [],
      pricing: "Unknown",
      limitations: [],
      location: "Pune",
      countries: [],
      languages: ["English"],
      industry: "Unknown",
      businessSize: "Unknown",
      scope: "both",
    };
    const job = {
      id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      lease_token: crypto.randomUUID(),
      stage: 1,
      attempts: 0,
      data: {
        offer,
        queries: ["first query"],
        candidates: [],
        discoverySources: [],
        excluded: ["already-seen.example"],
        feedback: [],
        reason: "",
        discoveryRound: round,
        previousQueries: [],
      },
    };
    state.rpc.mockResolvedValue({ data: [job], error: null });
    const chain = {
      eq: vi.fn(),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    chain.eq.mockReturnValue(chain);
    state.update.mockReturnValue(chain);
    state.select.mockReturnValue(chain);
    await tick(job.id);
    expect(state.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stage: nextStage,
        status: "queued",
        data: expect.objectContaining({
          discoveryRound: nextRound,
          excluded: ["already-seen.example"],
          ...(round === 0
            ? { queries: [], previousQueries: ["first query"] }
            : {}),
        }),
      }),
    );
  },
);
