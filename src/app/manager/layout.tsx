import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ManagerBottomNav from "@/components/layout/ManagerBottomNav";
import ManagerSidebar from "@/components/layout/ManagerSidebar";

export default async function ManagerLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="manager-container">
      <ManagerSidebar
        userName={session.user.name}
        orgName={session.user.organizationName}
      />
      <div className="manager-main">{children}</div>
      <ManagerBottomNav />
    </div>
  );
}
