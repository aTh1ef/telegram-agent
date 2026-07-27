import { getSupabaseAdmin } from "./supabase";
import { getChatMember, isActiveMember, type ChatMemberUpdated } from "./telegram";

const SYNCED_LABEL = "channel member";

function getChannelId(): string | null {
  return process.env.TELEGRAM_CHANNEL_ID?.trim() || null;
}

async function upsertAllowedUser(telegramUserId: number, label: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("allowed_users")
    .upsert({ telegram_user_id: telegramUserId, label }, { onConflict: "telegram_user_id" });

  if (error) console.error("allowed_user_upsert_failed", error);
}

async function removeAllowedUser(telegramUserId: number) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("allowed_users")
    .delete()
    .eq("telegram_user_id", telegramUserId);

  if (error) console.error("allowed_user_delete_failed", error);
}

// The allowed_users table is the fast path and mirrors channel membership.
// Manually added rows still work, so the dashboard remains usable for testing
// and for granting access to someone outside the channel.
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

  if (data) return true;

  // Not mirrored yet. Anyone who joined before the bot was made an admin never
  // produced a chat_member event, so ask Telegram directly and cache the answer.
  const channelId = getChannelId();
  if (!channelId) return false;

  const member = await getChatMember(channelId, telegramUserId);
  if (!isActiveMember(member)) return false;

  await upsertAllowedUser(telegramUserId, SYNCED_LABEL);
  return true;
}

function matchesConfiguredChannel(chat: { id: number; username?: string }, channelId: string) {
  if (String(chat.id) === channelId) return true;
  return chat.username ? `@${chat.username}` === channelId : false;
}

// Mirrors membership changes in the configured channel into allowed_users, so
// the per-message check stays a single database lookup. Joins grant access,
// leaving or being removed revokes it immediately.
export async function syncChatMemberUpdate(update: ChatMemberUpdated): Promise<void> {
  const channelId = getChannelId();
  if (!channelId || !matchesConfiguredChannel(update.chat, channelId)) return;

  const { user } = update.new_chat_member;

  if (isActiveMember(update.new_chat_member)) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    await upsertAllowedUser(user.id, name || SYNCED_LABEL);
  } else {
    await removeAllowedUser(user.id);
  }
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
