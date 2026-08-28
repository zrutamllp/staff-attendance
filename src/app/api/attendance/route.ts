import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { parseBody, parseQuery } from "@/lib/validate";
import {
  attendanceMonthQuerySchema,
  setAttendanceBodySchema,
} from "@/validators/attendance";
import { getAttendanceGridData, setAttendance } from "@/services/attendance-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { year, month } = parseQuery(attendanceMonthQuerySchema, {
      year: searchParams.get("year"),
      month: searchParams.get("month"),
    });

    const data = await getAttendanceGridData(user, year, month);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = parseBody(setAttendanceBodySchema, await request.json());
    const record = await setAttendance(
      user,
      body.employeeId,
      body.date,
      body.status ?? null
    );

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    return handleApiError(error);
  }
}
