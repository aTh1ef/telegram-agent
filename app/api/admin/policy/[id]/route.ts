import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseAdmin();

  // policy_chunks has an on-delete-cascade FK to policy_documents,
  // so removing the document row removes its embedded chunks too.
  const { error } = await supabase
    .from("policy_documents")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("policy_delete_failed", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
