import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, sessionCookieOptions } from "@/lib/auth";

const bodySchema = z.object({ password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "Server is not configured" },
      { status: 500 }
    );
  }

  if (parsed.data.password !== adminPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createAdminSession();
  const res = NextResponse.json({ ok: true });
  const opts = sessionCookieOptions();
  res.cookies.set(opts.name, token, opts);
  return res;
}
