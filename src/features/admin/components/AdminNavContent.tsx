"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  FileText,
  Database,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

export const adminNavItems = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/admin/managers", label: "Managers", icon: UserCog },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/backup", label: "Backup", icon: Database },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminNavContentProps {
  onNavigate?: () => void;
}

export default function AdminNavContent({ onNavigate }: AdminNavContentProps) {
  const pathname = usePathname();

  return (
    <>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {adminNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-charcoal text-white"
                  : "text-muted hover:bg-surface hover:text-charcoal"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-stone-200 p-4">
        <Link
          href="/admin/employees/add"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted hover:bg-surface hover:text-charcoal"
        >
          <Users size={18} />
          Add Employee
        </Link>
        <Link
          href="/manager/home"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted hover:bg-surface hover:text-charcoal"
        >
          <CalendarDays size={18} />
          Manager View
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-absent hover:bg-red-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );
}
