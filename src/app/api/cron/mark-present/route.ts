import { NextRequest, NextResponse } from "next/server";
import { runAutoPresent } from "@/services/attendance-service";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAutoPresent({ requireWindow: true });
  return NextResponse.json(result);
}
