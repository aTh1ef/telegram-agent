import { type HistoryTurn } from "../history";
import { retrieveRelevantChunks, type PolicyMatch } from "./retrieval";
import { answerFromPolicy } from "./hrPolicyAgent";
import { answerGeneral } from "./generalAgent";

export interface OrchestrationResult {
  answer: string;
  agentUsed: "hr_policy" | "general";
  matchedChunkIds: string[];
}

const FOLLOW_UP_WORD_LIMIT = 8;

// Third-person pronouns and demonstratives point at something said earlier;
// second person ("you") refers to the bot, so it is deliberately excluded.
const REFERENTIAL = /\b(it|its|that|this|these|those|they|them|their)\b/i;
const CONTINUATION = /^(and|also|what about|how about|plus)\b/i;

// Prepending the previous question lifts similarity for every message, noise
// included ("Thanks!" scores higher than a real follow-up once context is
// attached). So context is only pulled in for messages that are lexically
// incomplete on their own — a short fragment carrying an unresolved reference.
function needsConversationalContext(question: string): boolean {
  const wordCount = question.trim().split(/\s+/).length;
  if (wordCount > FOLLOW_UP_WORD_LIMIT) return false;
  return REFERENTIAL.test(question) || CONTINUATION.test(question);
}

// Routing is decided by retrieval confidence rather than a separate LLM
// classification call. Two reasons: the HR agent can then only ever fire when
// grounding actually exists, and it halves the generation calls per message.
export async function orchestrate(
  question: string,
  history: HistoryTurn[] = []
): Promise<OrchestrationResult> {
  let matches: PolicyMatch[] = await retrieveRelevantChunks(question);

  if (matches.length === 0 && history.length > 0 && needsConversationalContext(question)) {
    const previous = history[history.length - 1].question;
    matches = await retrieveRelevantChunks(`${previous}\n${question}`);
  }

  if (matches.length > 0) {
    const answer = await answerFromPolicy(question, matches, history);
    return {
      answer,
      agentUsed: "hr_policy",
      matchedChunkIds: matches.map((m) => m.id),
    };
  }

  const answer = await answerGeneral(question, history);
  return { answer, agentUsed: "general", matchedChunkIds: [] };
}
