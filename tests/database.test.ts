import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const db = new PGlite();
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  await db.exec(
    `create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role bypassrls; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated,service_role; insert into auth.users values('${a}'),('${b}');`,
  );
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
}, 30000);
afterAll(() => db.close());
it("isolates all 16 tables for cross-user reads, inserts, updates and deletes", async () => {
  const c = "00000000-0000-4000-8000-000000000003",
    d = "00000000-0000-4000-8000-000000000004";
  await db.exec(`reset role;insert into auth.users values('${c}'),('${d}')`);
  const offer = crypto.randomUUID(),
    search = crypto.randomUUID(),
    business = crypto.randomUUID(),
    conversation = crypto.randomUUID();
  const fixtures: Array<[string, Record<string, unknown>]> = [
    ["profiles", {}],
    ["offer_profiles", { id: offer }],
    [
      "searches",
      { id: search, offer_id: offer, idempotency_key: crypto.randomUUID() },
    ],
    ["search_stages", { search_id: search, stage: 0, item_key: "test" }],
    [
      "businesses",
      {
        id: business,
        search_id: search,
        domain: "isolation.example",
        name: "Isolation fixture",
      },
    ],
    ["evidence_items", { business_id: business, type: "unknown" }],
    [
      "contacts",
      {
        business_id: business,
        channel: "email",
        value: "test@isolation.example",
        source_url: "https://isolation.example",
      },
    ],
    ["people", { business_id: business }],
    ["prospect_states", { business_id: business }],
    ["outreach_outcomes", { business_id: business }],
    ["conversations", { id: conversation, search_id: search }],
    ["messages", { conversation_id: conversation }],
    ["usage_counters", { feature: "test" }],
    [
      "research_cache",
      { cache_key: "test", expires_at: "2030-01-01T00:00:00Z" },
    ],
    ["audit_log", { event: "test" }],
    ["exports", {}],
  ];
  const rows: Array<[string, Record<string, unknown>]> = [];
  for (const [table, extra] of fixtures) {
    const values = { user_id: d, ...extra };
    const cols = Object.keys(values);
    const row = await db.query<Record<string, unknown>>(
      `insert into public.${table}(${cols.join(",")}) values(${cols.map((_, i) => "$" + (i + 1)).join(",")}) returning *`,
      Object.values(values),
    );
    rows.push([table, row.rows[0]]);
  }
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${c}',false)`,
  );
  for (const [table, row] of rows) {
    expect(
      (await db.query(`select id from public.${table} where user_id=$1`, [d]))
        .rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        `insert into public.${table} select * from jsonb_populate_record(null::public.${table},$1::jsonb)`,
        [JSON.stringify({ ...row, id: crypto.randomUUID() })],
      ),
    ).rejects.toThrow();
    for (const sql of [
      `update public.${table} set data='{}' where user_id=$1 returning id`,
      `delete from public.${table} where user_id=$1 returning id`,
    ]) {
      try {
        expect((await db.query(sql, [d])).rows).toHaveLength(0);
      } catch (error) {
        expect(String(error)).toContain("permission denied");
      }
    }
  }
  await db.exec("reset role");
});
it("reserves a batch once under idempotent start and rejects concurrent active batches", async () => {
  const u = "00000000-0000-4000-8000-000000000005";
  await db.exec(`reset role;insert into auth.users values('${u}')`);
  const o = await db.query<{ id: string }>(
    "insert into offer_profiles(user_id,confirmed,data) values($1,true,$2) returning id",
    [u, JSON.stringify({ profile: { purpose: "Test" } })],
  );
  const k = crypto.randomUUID();
  await db.exec("set role service_role");
  const first = await db.query<{ id: string }>(
    "select start_search($1,$2,$3) id",
    [u, o.rows[0].id, k],
  );
  const second = await db.query<{ id: string }>(
    "select start_search($1,$2,$3) id",
    [u, o.rows[0].id, k],
  );
  expect(first.rows[0].id).toBe(second.rows[0].id);
  expect(
    (
      await db.query<{ amount: number }>(
        "select amount from usage_counters where user_id=$1 and feature='research'",
        [u],
      )
    ).rows[0].amount,
  ).toBe(1);
  await expect(
    db.query("select start_search($1,$2,$3)", [
      u,
      o.rows[0].id,
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow("Active search");
  await db.exec("reset role");
});
it("enables and forces RLS on every table and denies anon grants", async () => {
  const r = await db.query<{
    relrowsecurity: boolean;
    relforcerowsecurity: boolean;
  }>(
    "select relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r'",
  );
  expect(r.rows).toHaveLength(16);
  expect(r.rows.every((x) => x.relrowsecurity && x.relforcerowsecurity)).toBe(
    true,
  );
  await db.exec("set role anon");
  await expect(db.query("select * from public.profiles")).rejects.toThrow();
  await db.exec("reset role");
});
it("isolates reads, writes, changes of owner and deletes", async () => {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${a}',false)`,
  );
  await db.query("insert into profiles(user_id) values($1)", [a]);
  await expect(
    db.query("insert into profiles(user_id) values($1)", [b]),
  ).rejects.toThrow();
  await expect(
    db.query("update profiles set user_id=$1", [b]),
  ).rejects.toThrow();
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);
  expect((await db.query("select * from profiles")).rows).toHaveLength(0);
  expect(
    (await db.query("delete from profiles returning id")).rows,
  ).toHaveLength(0);
  await db.exec("reset role");
});
it("blocks cross-tenant composite references and privileged counter edits", async () => {
  const offer = await db.query<{ id: string }>(
    "insert into offer_profiles(user_id) values($1) returning id",
    [a],
  );
  await db.exec("set role service_role");
  await expect(
    db.query(
      "insert into searches(user_id,offer_id,idempotency_key) values($1,$2,gen_random_uuid())",
      [b, offer.rows[0].id],
    ),
  ).rejects.toThrow();
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${a}',false)`,
  );
  await expect(
    db.query("select reserve_usage($1,'research',1)", [a]),
  ).rejects.toThrow();
  await expect(
    db.query(
      "insert into usage_counters(user_id,feature) values($1,'research')",
      [a],
    ),
  ).rejects.toThrow();
  await db.exec("reset role");
});
it("atomically stops at per-user quota without resetting counters", async () => {
  await db.exec("set role service_role");
  for (let i = 0; i < 5; i++)
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select reserve_usage($1,'research',1) ok",
          [a],
        )
      ).rows[0].ok,
    ).toBe(true);
  expect(
    (
      await db.query<{ ok: boolean }>(
        "select reserve_usage($1,'research',1) ok",
        [a],
      )
    ).rows[0].ok,
  ).toBe(false);
  await db.exec("reset role");
});
it("refreshes saved prospect contacts atomically while preserving its ID and user state", async () => {
  await db.exec("reset role");
  const offer = crypto.randomUUID(),
    search = crypto.randomUUID(),
    id = crypto.randomUUID();
  await db.query(
    "insert into public.offer_profiles(id,user_id) values($1,$2)",
    [offer, a],
  );
  await db.query(
    "insert into public.searches(id,user_id,offer_id,idempotency_key) values($1,$2,$3,$4)",
    [search, a, offer, crypto.randomUUID()],
  );
  const p = {
    id,
    domain: "refresh.example",
    name: "Refresh",
    sources: [],
    assessment: {
      observations: [],
      inferences: [],
      unknowns: [],
      people: [],
      contacts: [],
    },
  };
  await db.query("select public.save_prospect($1,$2,$3::jsonb)", [
    a,
    search,
    JSON.stringify(p),
  ]);
  await db.query(
    "insert into public.prospect_states(user_id,business_id,status) values($1,$2,$3)",
    [a, id, "saved"],
  );
  p.assessment.contacts = [
    {
      channel: "email",
      value: "hello@refresh.example",
      sourceUrl: "https://refresh.example/contact",
      checkedAt: "2026-11-09T00:00:00Z",
    },
  ] as never[];
  await db.query("select public.save_prospect($1,$2,$3::jsonb)", [
    a,
    search,
    JSON.stringify({ ...p, id: crypto.randomUUID() }),
  ]);
  const rows = await db.query<{
    id: string;
    data: { id: string; assessment: { contacts: unknown[] } };
  }>("select id,data from public.businesses where id=$1", [id]);
  expect(rows.rows[0].data.id).toBe(id);
  expect(rows.rows[0].data.assessment.contacts).toHaveLength(1);
  expect(
    (await db.query("select * from public.contacts where business_id=$1", [id]))
      .rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from public.prospect_states where business_id=$1",
        [id],
      )
    ).rows[0].status,
  ).toBe("saved");
});
