import { extractText, getDocumentProxy } from "unpdf";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

const CHUNK_SIZE = 900;
const OVERLAP_SENTENCES = 1;

// PDF extraction usually returns one long run-on with no paragraph breaks, so
// structure has to be recovered before splitting. Numbered headings ("4. End-of
// Service Gratuity") are the natural section boundaries in policy documents.
function restoreStructure(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  const withBreaks = normalized.replace(/(\d+\.\s+[A-Z])/g, "\n\n$1");
  return withBreaks.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}

// Packs sentences up to CHUNK_SIZE, carrying the tail sentence into the next
// chunk so a fact split across a boundary still has context on both sides.
// Sentence-aligned, so chunks never begin mid-word.
function packSentences(sentences: string[]): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  let length = 0;

  for (const sentence of sentences) {
    if (length > 0 && length + sentence.length + 1 > CHUNK_SIZE) {
      chunks.push(current.join(" "));
      current = current.slice(-OVERLAP_SENTENCES);
      length = current.join(" ").length;
    }
    current.push(sentence);
    length += sentence.length + 1;
  }

  if (current.length) chunks.push(current.join(" "));
  return chunks;
}

export function chunkText(text: string): string[] {
  const chunks: string[] = [];

  for (const section of restoreStructure(text)) {
    if (section.length <= CHUNK_SIZE) {
      chunks.push(section);
    } else {
      chunks.push(...packSentences(splitSentences(section)));
    }
  }

  return chunks.filter((c) => c.trim().length > 20);
}
