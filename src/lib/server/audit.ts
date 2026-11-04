import "server-only";
import { adminDb } from "./admin";
import { AppError } from "../errors";
export async function assertAccountEnabled(userId: string) {
  const { data, error } = await adminDb()
    .from("audit_log")
    .select("event")
    .eq("user_id", userId)
    .in("event", ["account.blocked", "account.unblocked"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (data?.[0]?.event === "account.blocked")
    throw new AppError(
      "ACCOUNT_PAUSED",
      403,
      "This account is paused. Contact the operator.",
    );
}
export async function audit(
  userId: string,
  event: string,
  metadata: Record<string, string | number | boolean> = {},
) {
  const { error } = await adminDb()
    .from("audit_log")
    .insert({ user_id: userId, event, data: metadata });
  if (error) throw error;
}
