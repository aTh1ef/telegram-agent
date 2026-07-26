import { extractText, getDocumentProxy } from "unpdf";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

// Splits on paragraph boundaries where possible, falling back to a fixed
// character window with overlap so no sentence gets cut across chunks
// without any shared context.
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const paragraphs = normalized.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length <= CHUNK_SIZE) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (current) chunks.push(current);

    if (paragraph.length <= CHUNK_SIZE) {
      current = paragraph;
    } else {
      // Paragraph itself is too long — window it with overlap.
      let start = 0;
      while (start < paragraph.length) {
        const end = Math.min(start + CHUNK_SIZE, paragraph.length);
        chunks.push(paragraph.slice(start, end));
        start += CHUNK_SIZE - CHUNK_OVERLAP;
      }
      current = "";
    }
  }

  if (current) chunks.push(current);

  return chunks.filter((c) => c.trim().length > 20);
}
