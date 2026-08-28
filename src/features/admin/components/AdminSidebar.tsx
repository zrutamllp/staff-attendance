"use client";

import AdminNavContent from "@/features/admin/components/AdminNavContent";
import { APP_NAME } from "@/lib/brand";

interface AdminSidebarProps {
  userName?: string | null;
  orgName?: string | null;
}

export default function AdminSidebar({ userName }: AdminSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 flex-col border-r border-stone-200 bg-surface-elevated lg:flex">
      <div className="shrink-0 border-b border-stone-200 p-6">
        <h1 className="truncate text-lg font-semibold text-charcoal">{APP_NAME}</h1>
        <p className="mt-1 truncate text-sm text-muted">{userName}</p>
      </div>

      <AdminNavContent />
    </aside>
  );
}
