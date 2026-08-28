import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import {
  createEmployeeAdvance,
  getAdvanceSummary,
  getAdvancesForEmployee,
} from "@/services/attendance-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const advances = await getAdvancesForEmployee(user, id);

    if (advances === null) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const summary = await getAdvanceSummary(user, id);
    return NextResponse.json({ advances, summary });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const advance = await createEmployeeAdvance(user, id, {
      amount: body.amount,
      date: body.date,
      notes: body.notes,
    });

    if (!advance) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(advance, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
