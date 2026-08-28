import { auth } from "@/lib/auth";
import { getOrgAnalytics } from "@/services/attendance-service";
import type { SessionUser } from "@/types/session";
import AdminOverviewClient from "@/features/admin/components/AdminOverviewClient";

export default async function AdminOverviewPage() {
  const session = await auth();
  const user = session?.user as SessionUser;
  const analytics = await getOrgAnalytics(user);
  return <AdminOverviewClient analytics={analytics} />;
}
