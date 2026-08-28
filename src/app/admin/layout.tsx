import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/features/admin/components/AdminSidebar";
import AdminMobileNav from "@/features/admin/components/AdminMobileNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "master_admin") redirect("/manager/home");

  return (
    <div className="admin-container">
      <AdminMobileNav
        userName={session.user.name}
        orgName={session.user.organizationName}
      />
      <AdminSidebar
        userName={session.user.name}
        orgName={session.user.organizationName}
      />
      <main className="admin-main">{children}</main>
    </div>
  );
}
