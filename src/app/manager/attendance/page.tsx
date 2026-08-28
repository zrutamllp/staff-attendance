import { auth } from "@/lib/auth";
import { getAttendanceGridData } from "@/services/attendance-service";
import type { SessionUser } from "@/types/session";
import AttendancePageClient from "@/features/attendance/components/AttendancePageClient";

export default async function AttendancePage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const data = user
    ? await getAttendanceGridData(user, year, month)
    : { grid: [], editPolicy: { role: "manager", adminWindowDays: 7, referenceDate: "" } };

  return (
    <AttendancePageClient
      initialYear={year}
      initialMonth={month}
      initialData={{
        grid: data.grid as import("@/types/views").AttendanceGridRow[],
        editPolicy: data.editPolicy,
      }}
    />
  );
}
