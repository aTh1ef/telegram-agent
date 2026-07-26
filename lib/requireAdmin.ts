import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "./auth";

// Returns a 401 response if the caller isn't an authenticated admin, otherwise null.
export async function requireAdmin(): Promise<NextResponse | null> {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
