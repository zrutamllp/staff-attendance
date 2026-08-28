"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Users, FileText, User } from "lucide-react";

const navItems = [
  { href: "/manager/home", label: "Home", icon: Home },
  { href: "/manager/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/manager/employees", label: "Employees", icon: Users },
  { href: "/manager/reports", label: "Reports", icon: FileText },
  { href: "/manager/profile", label: "Profile", icon: User },
];

export default function ManagerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-surface-elevated/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-medium transition ${
                active ? "text-charcoal" : "text-muted hover:text-charcoal"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "text-charcoal" : "text-muted"}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
