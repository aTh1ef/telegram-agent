import { generateText } from "../gemini";
import type { PolicyMatch } from "./retrieval";

const SYSTEM_PROMPT = `You are an HR assistant answering questions about UAE labor law and
company HR policy, grounded strictly in the policy excerpts provided below.

Rules:
- Answer only using the provided excerpts. Do not invent details that aren't there.
- If the excerpts don't fully answer the question, say what's missing rather than guessing.
- Keep answers concise and practical, suitable for a chat message.
- Do not mention "excerpts" or "context" to the user — just answer naturally, as an HR assistant would.`;

export async function answerFromPolicy(
  question: string,
  matches: PolicyMatch[]
): Promise<string> {
  const context = matches
    .map((m, i) => `[Excerpt ${i + 1}]\n${m.content}`)
    .join("\n\n");

  const userPrompt = `Policy excerpts:\n${context}\n\nQuestion: ${question}`;

  return generateText({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
  });
}
