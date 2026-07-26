import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseAdmin();

  const [totalRes, hrRes, generalRes, blockedRes, usersRes, avgRes] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("agent_used", "hr_policy"),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("agent_used", "general"),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("agent_used", "blocked"),
    supabase.from("allowed_users").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("response_time_ms").not("response_time_ms", "is", null).limit(500),
  ]);

  const times = (avgRes.data ?? []).map((r) => r.response_time_ms as number);
  const avgResponseMs = times.length
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : null;

  return NextResponse.json({
    totalConversations: totalRes.count ?? 0,
    hrPolicyCount: hrRes.count ?? 0,
    generalCount: generalRes.count ?? 0,
    blockedCount: blockedRes.count ?? 0,
    allowedUserCount: usersRes.count ?? 0,
    avgResponseMs,
  });
}
