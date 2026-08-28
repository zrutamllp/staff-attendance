import { auth } from "@/lib/auth";
import { getReport } from "@/services/attendance-service";
import type { SessionUser } from "@/types/session";
import type { MonthlyReport } from "@/types/views";
import ReportsPageClient from "@/features/attendance/components/ReportsPageClient";

export default async function ReportsPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const report = user
    ? ((await getReport(user, "monthly", {
        year: String(year),
        month: String(month),
      })) as MonthlyReport)
    : ({} as MonthlyReport);

  return (
    <ReportsPageClient
      initialYear={year}
      initialMonth={month}
      initialReport={report}
    />
  );
}
