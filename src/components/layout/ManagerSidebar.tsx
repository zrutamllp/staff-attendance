"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Users, FileText, User, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { APP_NAME } from "@/lib/brand";

const navItems = [
  { href: "/manager/home", label: "Home", icon: Home },
  { href: "/manager/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/manager/employees", label: "Employees", icon: Users },
  { href: "/manager/reports", label: "Reports", icon: FileText },
  { href: "/manager/profile", label: "Profile", icon: User },
];

interface ManagerSidebarProps {
  userName?: string | null;
  orgName?: string | null;
}

export default function ManagerSidebar({ userName }: ManagerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 flex-col border-r border-stone-200 bg-surface-elevated md:flex">
      <div className="shrink-0 border-b border-stone-200 p-6">
        <h1 className="truncate text-lg font-semibold text-charcoal">{APP_NAME}</h1>
        <p className="mt-1 truncate text-sm text-muted">{userName}</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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
          href="/manager/employees/add"
          className="mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted hover:bg-surface hover:text-charcoal"
        >
          <Users size={18} />
          Add Employee
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-absent hover:bg-red-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
