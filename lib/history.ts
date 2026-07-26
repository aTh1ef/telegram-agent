import { getSupabaseAdmin } from "./supabase";

export interface HistoryTurn {
  question: string;
  answer: string;
}

const MAX_TURNS = 5;
const SESSION_WINDOW_MINUTES = 30;

// Recent turns for one user, oldest first. Scoped to a rolling time window so a
// question asked days later starts a fresh session instead of inheriting stale
// context. Blocked attempts are excluded — they aren't part of the conversation.
export async function getRecentHistory(telegramUserId: number): Promise<HistoryTurn[]> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - SESSION_WINDOW_MINUTES * 60_000).toISOString();

  const { data, error } = await supabase
    .from("conversations")
    .select("question, answer")
    .eq("telegram_user_id", telegramUserId)
    .neq("agent_used", "blocked")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_TURNS);

  if (error) {
    console.error("history_fetch_failed", error);
    return [];
  }

  return (data ?? []).reverse();
}

export function formatHistory(turns: HistoryTurn[]): string {
  return turns
    .map((turn) => `User: ${turn.question}\nAssistant: ${turn.answer}`)
    .join("\n\n");
}
