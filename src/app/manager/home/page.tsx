import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/services/attendance-service";
import type { SessionUser } from "@/types/session";
import ManagerHomeClient from "@/features/attendance/components/ManagerHomeClient";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function ManagerHomePage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const stats = user ? await getDashboardStats(user) : null;
  const displayName = user?.name?.trim().split(/\s+/)[0] ?? "";
  const today = format(new Date(), "MMMM d, yyyy");

  return (
    <ManagerHomeClient
      stats={stats}
      userName={displayName}
      greeting={getGreeting()}
      today={today}
    />
  );
}
