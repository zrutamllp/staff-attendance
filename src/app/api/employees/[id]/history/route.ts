import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import {
  getEmployeeAttendanceHistory,
  getEmployeeAssignmentHistory,
} from "@/services/attendance-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const [attendance, assignments] = await Promise.all([
      getEmployeeAttendanceHistory(user, id, year),
      getEmployeeAssignmentHistory(user, id),
    ]);

    if (!attendance || !assignments) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ attendance, assignments });
  } catch (error) {
    return handleApiError(error);
  }
}
