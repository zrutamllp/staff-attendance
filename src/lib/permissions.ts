import type { Employee } from "@/types/domain";
import type { SessionUser } from "@/types/session";

export function isMasterAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === "master_admin";
}

/** All users in the same organization can access any employee. */
export function canAccessEmployee(
  user: SessionUser | null | undefined,
  employee: Employee | null | undefined
): boolean {
  if (!user || !employee) return false;
  return employee.organizationId === user.organizationId;
}

export function getEmployeeFilter(user: SessionUser): { organizationId: string } {
  return { organizationId: user.organizationId };
}
