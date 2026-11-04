import { env } from "@/lib/server/env";
import { tick } from "@/lib/server/jobs";
import { handle } from "@/lib/server/guard";
import { AppError } from "@/lib/errors";
import { adminDb } from "@/lib/server/admin";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function GET(request: Request) {
  return handle(async () => {
    const secret = env().CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
      throw new AppError("AUTH", 401);
    const { error } = await adminDb()
      .from("research_cache")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (error) throw error;
    await tick();
    return Response.json({ ok: true });
  });
}
