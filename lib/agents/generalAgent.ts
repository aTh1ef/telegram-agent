import { generateText } from "../gemini";
import { formatHistory, type HistoryTurn } from "../history";

const SYSTEM_PROMPT = `You are a helpful, friendly assistant chatting over Telegram.
Keep answers short and conversational, and use the conversation history to follow
context across turns. If asked about HR or UAE labor policy topics you don't have
grounded information for, say so honestly instead of guessing.`;

export async function answerGeneral(
  question: string,
  history: HistoryTurn[] = []
): Promise<string> {
  const conversation = history.length
    ? `Conversation so far:\n${formatHistory(history)}\n\nLatest message: ${question}`
    : question;

  return generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: conversation,
    temperature: 0.5,
  });
}
