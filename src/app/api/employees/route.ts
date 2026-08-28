import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { parseBody } from "@/lib/validate";
import { createEmployeeBodySchema } from "@/validators/employees";
import {
  getEmployeesWithManagers,
  createEmployee,
} from "@/services/attendance-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "active" || statusParam === "exited" ? statusParam : undefined;

    const employees = await getEmployeesWithManagers(user, { status });
    return NextResponse.json(employees);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = parseBody(createEmployeeBodySchema, await request.json());
    const employee = await createEmployee(user, body);
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid manager selected") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
