import { generateText } from "../gemini";

const SYSTEM_PROMPT = `You are a helpful, friendly assistant chatting over Telegram.
Keep answers short and conversational. If asked about HR or UAE labor policy topics
you don't have grounded information for, say so honestly instead of guessing.`;

export async function answerGeneral(question: string): Promise<string> {
  return generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: question,
    temperature: 0.5,
  });
}
