import { GoogleGenerativeAI } from "@google/generative-ai";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return apiKey;
}

// Free-tier request quota is granted per model, so a throttled model can be
// stepped over rather than failing the message. Ordered best-quality first.
const CHAT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
];

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768; // must match the `vector(768)` column in policy_chunks

// Rate limiting, transient overload, and a model being retired are all worth
// trying the next model for. Auth and malformed-request errors are not.
function isWorthFallingBackFrom(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 429 || status === 503 || status === 404 || status === 500;
}

// Uses the REST API directly rather than the SDK, since outputDimensionality
// (needed to match our fixed-width pgvector column) isn't in the SDK's types.
export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${getApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embedContent failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { embedding: { values: number[] } };
  return data.embedding.values;
}

export async function generateText(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}): Promise<string> {
  const client = new GoogleGenerativeAI(getApiKey());
  let lastError: unknown;

  for (const modelName of CHAT_MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: params.systemPrompt,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
        generationConfig: {
          temperature: params.temperature ?? 0.3,
          maxOutputTokens: 1024,
        },
      });

      return result.response.text().trim();
    } catch (error) {
      lastError = error;
      if (!isWorthFallingBackFrom(error)) throw error;
      console.warn("gemini_model_fallback", {
        model: modelName,
        status: (error as { status?: number })?.status,
      });
    }
  }

  throw lastError;
}
