import { NextRequest, NextResponse } from "next/server";
import { requireMasterAdmin, handleApiError } from "@/lib/api-auth";
import { getErrorMessage } from "@/lib/errors";
import {
  getManagers,
  createManager,
  deactivateManager,
  transferEmployee,
  transferEmployees,
  getOrgAnalytics,
  exportBackup,
  getEmployeesWithManagers,
  getEmployeesFiltered,
  restoreBackup,
  validateBackup,
  getManagerDetail,
  updateManager,
} from "@/services/attendance-service";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await requireMasterAdmin();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "analytics") {
      const analytics = await getOrgAnalytics(user);
      return NextResponse.json(analytics);
    }

    if (type === "employees") {
      const employees = await getEmployeesFiltered(user, {
        status: searchParams.get("status") || "all",
        joinFrom: searchParams.get("joinFrom") || undefined,
        joinTo: searchParams.get("joinTo") || undefined,
        exitFrom: searchParams.get("exitFrom") || undefined,
        exitTo: searchParams.get("exitTo") || undefined,
      });
      return NextResponse.json(employees);
    }

    if (type === "manager") {
      const managerId = searchParams.get("id");
      if (!managerId) {
        return NextResponse.json({ error: "Manager id required" }, { status: 400 });
      }
      const detail = await getManagerDetail(user, managerId);
      if (!detail) {
        return NextResponse.json({ error: "Manager not found" }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    const managers = await getManagers(user);
    const analytics = await getOrgAnalytics(user);

    const managersWithCounts = managers.map((m) => {
      const stats = analytics.managerStats.find((s) => s.id === m.id);
      return {
        ...m,
        employeeCount: stats?.employeeCount ?? 0,
        percentage: stats?.percentage ?? 0,
      };
    });

    return NextResponse.json(managersWithCounts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireMasterAdmin();
    const body = await request.json();

    if (body.action === "create") {
      if (!body.name || !body.phone || !body.password) {
        return NextResponse.json(
          { error: "Name, phone number, and password are required" },
          { status: 400 }
        );
      }
      try {
        const manager = await createManager(user, body);
        return NextResponse.json(manager, { status: 201 });
      } catch (err) {
        if (
          getErrorMessage(err) === "Enter a valid phone number (10–15 digits)" ||
          getErrorMessage(err) === "This phone number is already registered"
        ) {
          return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 });
        }
        throw err;
      }
    }

    if (body.action === "update") {
      try {
        const updated = await updateManager(user, body.managerId, body);
        if (!updated) {
          return NextResponse.json({ error: "Manager not found" }, { status: 404 });
        }
        return NextResponse.json(updated);
      } catch (err) {
        if (
          getErrorMessage(err) === "Enter a valid phone number (10–15 digits)" ||
          getErrorMessage(err) === "This phone number is already registered"
        ) {
          return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 });
        }
        throw err;
      }
    }

    if (body.action === "restore") {
      if (!body.backup || !body.mode) {
        return NextResponse.json(
          { error: "Backup data and mode are required" },
          { status: 400 }
        );
      }
      const validation = validateBackup(body.backup, user.organizationId);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.errors.join("; ") },
          { status: 400 }
        );
      }
      try {
        const result = await restoreBackup(user, body.backup, body.mode);
        return NextResponse.json(result);
      } catch (err) {
        return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 });
      }
    }

    if (body.action === "deactivate") {
      const result = await deactivateManager(user, body.managerId);
      if (!result) {
        return NextResponse.json({ error: "Manager not found" }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    if (body.action === "transfer") {
      if (body.employeeIds?.length) {
        const results = await transferEmployees(
          user,
          body.employeeIds,
          body.newManagerId
        );
        return NextResponse.json({ transferred: results.length, employees: results });
      }
      const employee = await transferEmployee(user, body.employeeId, body.newManagerId);
      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
      return NextResponse.json(employee);
    }

    if (body.action === "reactivate-manager") {
      const [updated] = await db
        .update(users)
        .set({ status: "active" })
        .where(eq(users.id, body.managerId))
        .returning();
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireMasterAdmin();
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : NaN;
    const periodParam = searchParams.get("period");
    const period =
      periodParam === "weekly" || periodParam === "monthly" || periodParam === "yearly"
        ? periodParam
        : "yearly";

    if (!year || Number.isNaN(year)) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }

    const monthParam = searchParams.get("month");
    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const weekDate = searchParams.get("weekDate") || undefined;

    if (period === "monthly" && (!month || month < 1 || month > 12)) {
      return NextResponse.json({ error: "Valid month (1–12) is required" }, { status: 400 });
    }

    if (period === "weekly" && !weekDate) {
      return NextResponse.json(
        { error: "weekDate (YYYY-MM-DD) is required for weekly backup" },
        { status: 400 }
      );
    }

    const backup = await exportBackup(user, { period, year, month, weekDate });
    return NextResponse.json(backup);
  } catch (error) {
    return handleApiError(error);
  }
}
