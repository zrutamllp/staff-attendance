import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { getDashboardStats } from "@/services/attendance-service";

export async function GET() {
  try {
    const user = await requireAuth();
    const stats = await getDashboardStats(user);
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
