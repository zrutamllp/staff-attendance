import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { getReport } from "@/services/attendance-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const year = yearParam ? parseInt(yearParam, 10) : NaN;
    const month = monthParam ? parseInt(monthParam, 10) : NaN;
    const employeeId = searchParams.get("employeeId") || undefined;
    const managerId = searchParams.get("managerId") || undefined;

    if (!type || !year) {
      return NextResponse.json(
        { error: "Report type and year are required" },
        { status: 400 }
      );
    }

    if (["monthly", "manager-comparison"].includes(type) && !month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 });
    }

    if (type === "employee" && !employeeId) {
      return NextResponse.json({ error: "Employee id is required" }, { status: 400 });
    }

    const report = await getReport(user, type, {
      year: String(year),
      month: String(month),
      employeeId,
      managerId,
    });

    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}
