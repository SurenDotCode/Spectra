import { z } from "zod";
import { authenticated, body, handle, rate } from "@/lib/server/guard";
import { prospectSchema } from "@/lib/schemas";
import { discuss } from "@/lib/conversation";
import { AppError } from "@/lib/errors";
export async function POST(request: Request) {
  return handle(async () => {
    const { db, user } = await authenticated(request, true);
    await rate(`conversation:${user.id}`, 20);
    const v = await body(
      request,
      z
        .object({
          searchId: z.uuid(),
          conversationId: z.uuid().optional(),
          displayedIds: z.array(z.uuid()).min(1).max(200),
          focusedId: z.uuid().optional(),
          text: z.string().min(1).max(3000),
        })
        .strict(),
    );
    const { data: search, error: searchError } = await db
      .from("searches")
      .select("id")
      .eq("id", v.searchId)
      .eq("user_id", user.id)
      .single();
    if (searchError || !search) throw new AppError("NOT_FOUND", 404);
    const { data: rows, error } = await db
      .from("businesses")
      .select("id,data")
      .eq("user_id", user.id)
      .eq("search_id", v.searchId)
      .in("id", v.displayedIds);
    if (error) throw error;
    if (rows.length !== new Set(v.displayedIds).size)
      throw new AppError("NOT_FOUND", 404);
    const list = v.displayedIds.map((id) =>
      prospectSchema.parse(rows.find((r) => r.id === id)!.data),
    );
    if (v.focusedId && !v.displayedIds.includes(v.focusedId))
      throw new AppError("INPUT", 400);
    let conversationId = v.conversationId;
    let previous: string | undefined;
    let priorFocus: string | undefined;
    if (conversationId) {
      const { data: conversation, error: e } = await db
        .from("conversations")
        .select("data")
        .eq("id", conversationId)
        .eq("search_id", v.searchId)
        .eq("user_id", user.id)
        .single();
      if (e || !conversation) throw new AppError("NOT_FOUND", 404);
      const state = z
        .object({
          focused: z.string().optional(),
          previous: z.string().optional(),
        })
        .parse(conversation.data);
      previous = state.previous;
      priorFocus = state.focused;
    } else {
      const { data: conversation, error: e } = await db
        .from("conversations")
        .insert({
          user_id: user.id,
          search_id: v.searchId,
          data: { order: v.displayedIds },
        })
        .select("id")
        .single();
      if (e) throw e;
      conversationId = conversation.id;
    }
    const reply = discuss(v.text, list, v.focusedId ?? priorFocus, previous);
    const target = reply.focusIds[0];
    if (reply.action === "skip" && target) {
      const { error: e } = await db
        .from("prospect_states")
        .upsert(
          { user_id: user.id, business_id: target, status: "dismissed" },
          { onConflict: "user_id,business_id" },
        );
      if (e) throw e;
    }
    if (reply.action === "feedback" && target) {
      const { error: e } = await db.from("outreach_outcomes").insert({
        user_id: user.id,
        business_id: target,
        data: {
          provenance: "user-reported",
          note: v.text,
          reason: "already_has_solution",
          status: "contacted",
        },
      });
      if (e) throw e;
      const { error: stateError } = await db
        .from("prospect_states")
        .upsert(
          { user_id: user.id, business_id: target, status: "contacted" },
          { onConflict: "user_id,business_id" },
        );
      if (stateError) throw stateError;
    }
    const { error: updateError } = await db
      .from("conversations")
      .update({
        data: {
          order: v.displayedIds,
          focused: target ?? priorFocus,
          previous: target && target !== priorFocus ? priorFocus : previous,
        },
      })
      .eq("id", conversationId)
      .eq("user_id", user.id);
    if (updateError) throw updateError;
    const { error: messageError } = await db.from("messages").insert([
      {
        user_id: user.id,
        conversation_id: conversationId,
        data: { role: "user", text: v.text },
      },
      {
        user_id: user.id,
        conversation_id: conversationId,
        data: { role: "assistant", ...reply, provider: "stored-evidence" },
      },
    ]);
    if (messageError) throw messageError;
    return Response.json({ ...reply, conversationId });
  });
}
