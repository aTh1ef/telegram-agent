import { embedText } from "../gemini";
import { getSupabaseAdmin } from "../supabase";

export interface PolicyMatch {
  id: string;
  content: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  question: string,
  matchCount = 4
): Promise<PolicyMatch[]> {
  const embedding = await embedText(question);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("match_policy_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    match_threshold: 0.55,
  });

  if (error) {
    console.error("policy_chunk_retrieval_failed", error);
    return [];
  }

  return (data ?? []) as PolicyMatch[];
}
