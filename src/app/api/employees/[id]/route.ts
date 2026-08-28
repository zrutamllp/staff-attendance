import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { getLocalDateString } from "@/lib/auto-present";
import {
  getEmployeeWithManager,
  updateEmployee,
  exitEmployee,
  reactivateEmployee,
  deleteEmployee,
  getLeaveBalances,
  getLeaveGrantsForEmployee,
  getAdvancesForEmployee,
  getAdvanceSummary,
} from "@/services/attendance-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const employee = await getEmployeeWithManager(user, id);

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const today = getLocalDateString();
    const leaveBalances = await getLeaveBalances(id, today);
    const leaveGrants = await getLeaveGrantsForEmployee(user, id);
    const advances = await getAdvancesForEmployee(user, id);
    const advanceSummary = await getAdvanceSummary(user, id, today);

    return NextResponse.json({
      ...employee,
      leaveBalances,
      leaveGrants,
      advances,
      advanceSummary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (body.action === "exit") {
      const employee = await exitEmployee(user, id, body.exitDate, body.exitTime);
      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
      return NextResponse.json(employee);
    }

    if (body.action === "reactivate") {
      const employee = await reactivateEmployee(user, id, {
        joiningDate: body.joiningDate,
      });
      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
      return NextResponse.json(employee);
    }

    const employee = await updateEmployee(user, id, body);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const deleted = await deleteEmployee(user, id);

    if (!deleted) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
