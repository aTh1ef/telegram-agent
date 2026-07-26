import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractTextFromPdf, chunkText } from "@/lib/pdf";
import { embedText } from "@/lib/gemini";
import { mapWithConcurrency } from "@/lib/concurrency";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("policy_documents")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: doc, error: docError } = await supabase
    .from("policy_documents")
    .insert({ filename: file.name, status: "processing" })
    .select()
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPdf(buffer);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("No extractable text found in PDF");
    }

    const embeddings = await mapWithConcurrency(chunks, 5, (chunk) => embedText(chunk));

    const rows = chunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase.from("policy_chunks").insert(rows);
    if (insertError) throw insertError;

    await supabase
      .from("policy_documents")
      .update({ status: "ready", chunk_count: chunks.length })
      .eq("id", doc.id);

    return NextResponse.json({ data: { ...doc, status: "ready", chunk_count: chunks.length } });
  } catch (error) {
    console.error("policy_ingestion_failed", error);
    await supabase.from("policy_documents").update({ status: "failed" }).eq("id", doc.id);
    return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
  }
}
