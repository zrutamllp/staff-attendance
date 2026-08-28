import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import {
  createLeaveGrant,
  getLeaveGrantsForEmployee,
} from "@/services/attendance-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const grants = await getLeaveGrantsForEmployee(user, id);

    if (grants === null) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ grants });
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

    const grant = await createLeaveGrant(user, id, {
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      forDate: body.forDate,
    });

    if (!grant) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(grant, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
