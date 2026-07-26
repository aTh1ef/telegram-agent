import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("allowed_users")
    .select("*")
    .order("added_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load allowlist" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

const addSchema = z.object({
  telegramUserId: z.number().int().positive(),
  label: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("allowed_users")
    .insert({
      telegram_user_id: parsed.data.telegramUserId,
      label: parsed.data.label ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That user ID is already allowed" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("allowed_users")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: "Failed to remove user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
