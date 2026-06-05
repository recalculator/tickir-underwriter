import { NextRequest, NextResponse } from "next/server";
import { checkIdleDeals } from "@/lib/idle-check";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ success: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  await checkIdleDeals();

  return NextResponse.json({ checked: true, timestamp: new Date().toISOString() });
}
