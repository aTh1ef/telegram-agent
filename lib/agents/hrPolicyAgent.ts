import { generateText } from "../gemini";
import { formatHistory, type HistoryTurn } from "../history";
import type { PolicyMatch } from "./retrieval";

const SYSTEM_PROMPT = `You are an HR assistant answering questions about UAE labor law and
company HR policy, grounded strictly in the policy excerpts provided below.

Rules:
- Answer only using the provided excerpts. Do not invent details that aren't there.
- If the excerpts don't fully answer the question, say what's missing rather than guessing.
- Use the conversation history to resolve follow-up questions, but ground every
  factual claim in the excerpts, not in the history.
- Keep answers concise and practical, suitable for a chat message.
- Do not mention "excerpts" or "context" to the user — just answer naturally, as an HR assistant would.`;

export async function answerFromPolicy(
  question: string,
  matches: PolicyMatch[],
  history: HistoryTurn[] = []
): Promise<string> {
  const context = matches
    .map((m, i) => `[Excerpt ${i + 1}]\n${m.content}`)
    .join("\n\n");

  const conversation = history.length
    ? `Conversation so far:\n${formatHistory(history)}\n\n`
    : "";

  const userPrompt = `${conversation}Policy excerpts:\n${context}\n\nQuestion: ${question}`;

  return generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
  });
}
