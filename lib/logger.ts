import { getSupabaseAdmin } from "./supabase";

export interface ConversationLogEntry {
  telegramUserId: number;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  question: string;
  answer: string;
  agentUsed: "hr_policy" | "general" | "blocked";
  matchedChunkIds?: string[];
  responseTimeMs?: number;
}

export async function logConversation(entry: ConversationLogEntry) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("conversations").insert({
    telegram_user_id: entry.telegramUserId,
    telegram_username: entry.telegramUsername ?? null,
    first_name: entry.firstName ?? null,
    last_name: entry.lastName ?? null,
    question: entry.question,
    answer: entry.answer,
    agent_used: entry.agentUsed,
    matched_chunk_ids: entry.matchedChunkIds ?? null,
    response_time_ms: entry.responseTimeMs ?? null,
  });

  if (error) {
    console.error("conversation_log_failed", error);
  }
}
