import { getSupabaseAdmin } from "./supabase";

export async function isUserAllowed(telegramUserId: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("allowed_users")
    .select("id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (error) {
    console.error("allowlist_check_failed", error);
    return false;
  }

  return data !== null;
}

// Telegram may redeliver the same update on retry (e.g. if our response was
// slow). This records update_id the first time so a retry is a no-op.
// Returns true if this update was already processed.
export async function markUpdateProcessed(updateId: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("processed_updates")
    .insert({ update_id: updateId });

  if (error) {
    // Unique violation means we've seen this update_id before.
    if (error.code === "23505") return true;
    console.error("processed_updates_insert_failed", error);
    return false;
  }

  return false;
}
