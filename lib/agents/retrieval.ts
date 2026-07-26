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

  // Thrown rather than swallowed: an empty result now means "no grounding
  // exists", which routes to the general agent. A failed lookup must not be
  // mistaken for that, or a policy question silently gets an ungrounded answer.
  if (error) {
    console.error("policy_chunk_retrieval_failed", error);
    throw new Error(`Policy retrieval failed: ${error.message}`);
  }

  return (data ?? []) as PolicyMatch[];
}
