import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? "25"));
  const agent = searchParams.get("agent"); // 'hr_policy' | 'general' | 'blocked'
  const search = searchParams.get("search")?.trim();
  const userId = searchParams.get("userId");

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (agent) query = query.eq("agent_used", agent);
  if (userId) query = query.eq("telegram_user_id", Number(userId));
  if (search) {
    query = query.or(
      `question.ilike.%${search}%,answer.ilike.%${search}%,telegram_username.ilike.%${search}%,first_name.ilike.%${search}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("conversations_fetch_failed", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }

  return NextResponse.json({
    data,
    page,
    pageSize,
    total: count ?? 0,
  });
}
