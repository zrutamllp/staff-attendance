import { auth } from "@/lib/auth";
import { getEmployeesWithManagers } from "@/services/attendance-service";
import type { SessionUser } from "@/types/session";
import EmployeesPageClient from "@/features/employees/components/EmployeesPageClient";

export default async function EmployeesPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const employees = user
    ? await getEmployeesWithManagers(user, { status: "active" })
    : [];

  return <EmployeesPageClient initialEmployees={employees} />;
}
