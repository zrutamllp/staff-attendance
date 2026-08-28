import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/types/session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

export async function requireMasterAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "master_admin") {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export class ValidationError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.status = 400;
    this.code = code;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status }
    );
  }
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { success: false, message: error.message, code: error.code ?? null },
      { status: 422 }
    );
  }
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error as { status: number }).status === 400
  ) {
    const err = error as { message?: string; code?: string | null };
    return NextResponse.json(
      { success: false, message: err.message ?? "Bad request", code: err.code ?? null },
      { status: 400 }
    );
  }
  console.error(error);
  return NextResponse.json(
    { success: false, message: "Internal server error" },
    { status: 500 }
  );
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
