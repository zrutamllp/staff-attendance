import { NextRequest, NextResponse } from "next/server";

import { requireAuth, handleApiError } from "@/lib/api-auth";

import {
  getEmployeesForUser,
  getAttendanceForMonth,
  getAttendanceChangeLogsForMonth,
} from "@/services/attendance-service";

import {
  calculateTotals,
  getDaysInMonth,
  buildMonthDayRecords,
  effectiveStatus,
  formatStoredStatus,
} from "@/lib/attendance";

import { getLocalDateString } from "@/lib/auto-present";
import type { AttendanceStatus } from "@/types/session";

type AttendanceRecordMap = Record<string, AttendanceStatus | null>;
type EmployeeRecordMap = Record<string, AttendanceRecordMap>;

function formatRole(role) {
  return role === "master_admin" ? "Master Admin" : "Manager";
}

function formatTimestamp(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const year = yearParam ? parseInt(yearParam, 10) : NaN;
    const month = monthParam ? parseInt(monthParam, 10) : NaN;

    if (!year || !month) {
      return NextResponse.json(
        { error: "Year and month are required" },

        { status: 400 }
      );
    }

    const employees = await getEmployeesForUser(user, { status: "active" });

    const employeeIds = employees.map((e) => e.id);

    const records = await getAttendanceForMonth(
      user,

      year,

      month,

      employeeIds
    );

    const changeLogs = await getAttendanceChangeLogsForMonth(user, year, month);

    const daysInMonth = getDaysInMonth(year, month);

    const recordMap: EmployeeRecordMap = {};

    for (const r of records) {
      if (!recordMap[r.employeeId]) recordMap[r.employeeId] = {};

      recordMap[r.employeeId][r.date] = r.status;
    }

    const now = new Date();

    const rows = employees.map((emp) => {
      const empRecordMap = recordMap[emp.id] ?? {};

      const dayRecords = buildMonthDayRecords(year, month, empRecordMap, {
        joiningDate: emp.joiningDate,

        exitDate: emp.exitDate,
      });

      const dayStatuses = dayRecords.map(
        (d) =>
          (d.employed
            ? effectiveStatus(d.status, d.date, {
                referenceDate: now,
              })
            : null) ?? ""
      );

      const totals = calculateTotals(dayRecords, { referenceDate: now });

      return {
        name: emp.name,

        joiningDate: emp.joiningDate,

        days: dayStatuses,

        ...totals,
      };
    });

    const attendanceHeader = [
      "Name",

      "Joining Date",

      ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),

      "P",

      "A",

      "L",

      "SL",

      "H",

      "Attendance %",
    ];

    const csvRows = ["--- Attendance ---", attendanceHeader.join(",")];

    for (const row of rows) {
      csvRows.push(
        [
          `"${row.name}"`,

          row.joiningDate,

          ...row.days,

          row.P,

          row.A,

          row.L,

          row.SL ?? 0,

          row.H,

          row.percentage,
        ].join(",")
      );
    }

    csvRows.push("");

    csvRows.push("--- Change Log ---");

    csvRows.push(
      [
        "Employee",

        "Date",

        "Previous Status",

        "New Status",

        "Changed By",

        "Role",

        "Changed At",
      ].join(",")
    );

    for (const log of changeLogs) {
      csvRows.push(
        [
          `"${log.employeeName}"`,

          log.date,

          formatStoredStatus(log.previousStatus),

          formatStoredStatus(log.newStatus),

          `"${log.changedByName}"`,

          formatRole(log.changedByRole),

          formatTimestamp(log.changedAt),
        ].join(",")
      );
    }

    const csv = csvRows.join("\n");

    const filename = `attendance_${year}_${String(month).padStart(2, "0")}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",

        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
