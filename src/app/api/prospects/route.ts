import { z } from "zod";
import { authenticated, body, handle, rate } from "@/lib/server/guard";
import { adminDb } from "@/lib/server/admin";
import { prospectSchema } from "@/lib/schemas";
import { AppError } from "@/lib/errors";
import { prospectsCsv } from "@/lib/csv";
export async function GET(request: Request) {
  return handle(async () => {
    const { db, user } = await authenticated(request);
    const q = z
      .object({ search: z.uuid().optional() })
      .strict()
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    let query = db
      .from("businesses")
      .select("id,data,search_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (q.search) query = query.eq("search_id", q.search);
    const { data, error } = await query;
    if (error) throw error;
    const states = await db
      .from("prospect_states")
      .select("business_id,status")
      .eq("user_id", user.id);
    const list = (data ?? [])
      .map((r) => {
        const p = prospectSchema.parse(r.data);
        const state = states.data?.find((s) => s.business_id === r.id);
        return prospectSchema.parse({ ...p, status: state?.status ?? "new" });
      })
      .sort((a, b) => b.score - a.score || a.domain.localeCompare(b.domain));
    let offerId: string | undefined;
    if (q.search) {
      const result = await db
        .from("searches")
        .select("offer_id")
        .eq("id", q.search)
        .eq("user_id", user.id)
        .maybeSingle();
      offerId = result.data?.offer_id;
    }
    return Response.json({ prospects: list, offerId });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    const { db, user } = await authenticated(request, true);
    const input = await body(
      request,
      z.discriminatedUnion("action", [
        z
          .object({
            action: z.literal("state"),
            id: z.uuid(),
            status: z.enum(["new", "saved", "dismissed", "contacted"]),
          })
          .strict(),
        z
          .object({
            action: z.literal("export"),
            ids: z.array(z.uuid()).min(1).max(200),
          })
          .strict(),
        z
          .object({
            action: z.literal("outcome"),
            id: z.uuid(),
            status: z.enum(["new", "saved", "dismissed", "contacted"]),
            reason: z.enum([
              "already_has_solution",
              "not_fit",
              "not_now",
              "interested",
              "no_reply",
              "other",
            ]),
            note: z.string().min(1).max(3000),
          })
          .strict(),
      ]),
    );
    if (input.action === "export") {
      await rate(`export:${user.id}`, 3);
      const { data, error } = await db
        .from("businesses")
        .select("data")
        .eq("user_id", user.id)
        .in("id", input.ids);
      if (error) throw error;
      if (data.length !== new Set(input.ids).size)
        throw new AppError(
          "NOT_FOUND",
          404,
          "One or more prospects were not found.",
        );
      const { error: e } = await adminDb()
        .from("exports")
        .insert({
          user_id: user.id,
          data: { count: data.length, format: "csv" },
        });
      if (e) throw e;
      return Response.json({
        csv: prospectsCsv(data.map((d) => prospectSchema.parse(d.data))),
        filename: `spectra-shortlist-${new Date().toISOString().slice(0, 10)}.csv`,
      });
    }
    const { data: owned, error } = await db
      .from("businesses")
      .select("id")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .single();
    if (error || !owned)
      throw new AppError("NOT_FOUND", 404, "This prospect was not found.");
    const { error: stateError } = await db
      .from("prospect_states")
      .upsert(
        { user_id: user.id, business_id: input.id, status: input.status },
        { onConflict: "user_id,business_id" },
      );
    if (stateError) throw stateError;
    if (input.action === "outcome") {
      const { error: e } = await db.from("outreach_outcomes").insert({
        user_id: user.id,
        business_id: input.id,
        data: {
          reason: input.reason,
          note: input.note,
          provenance: "user-reported",
          status: input.status,
          recordedAt: new Date().toISOString(),
        },
      });
      if (e) throw e;
    }
    return Response.json({ ok: true });
  });
}
