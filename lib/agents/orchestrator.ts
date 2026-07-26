import { generateText } from "../gemini";
import { retrieveRelevantChunks } from "./retrieval";
import { answerFromPolicy } from "./hrPolicyAgent";
import { answerGeneral } from "./generalAgent";

export interface OrchestrationResult {
  answer: string;
  agentUsed: "hr_policy" | "general";
  matchedChunkIds: string[];
}

const CLASSIFIER_PROMPT = `You classify a single user message as either "hr_policy" or "general".
Reply with exactly one word: hr_policy or general.

"hr_policy" means the message is asking about UAE labor law, MOHRE regulations,
employment contracts, leave, gratuity, notice periods, termination, working hours,
or any workplace/HR policy topic.

"general" means anything else — greetings, small talk, or unrelated questions.`;

async function classifyIntent(question: string): Promise<"hr_policy" | "general"> {
  try {
    const raw = await generateText({
      systemPrompt: CLASSIFIER_PROMPT,
      userPrompt: question,
      temperature: 0,
    });
    const normalized = raw.toLowerCase().trim();
    return normalized.includes("hr_policy") ? "hr_policy" : "general";
  } catch (error) {
    console.error("intent_classification_failed", error);
    return "general";
  }
}

export async function orchestrate(question: string): Promise<OrchestrationResult> {
  const intent = await classifyIntent(question);

  if (intent === "hr_policy") {
    const matches = await retrieveRelevantChunks(question);

    if (matches.length > 0) {
      const answer = await answerFromPolicy(question, matches);
      return {
        answer,
        agentUsed: "hr_policy",
        matchedChunkIds: matches.map((m) => m.id),
      };
    }
    // No grounded policy text found — fall back rather than guessing.
  }

  const answer = await answerGeneral(question);
  return { answer, agentUsed: "general", matchedChunkIds: [] };
}
