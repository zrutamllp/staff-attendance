"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AdminNavContent from "@/features/admin/components/AdminNavContent";
import { APP_NAME } from "@/lib/brand";

interface AdminMobileNavProps {
  userName?: string | null;
  orgName?: string | null;
}

export default function AdminMobileNav({ userName }: AdminMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-stone-200 bg-surface-elevated/95 px-4 backdrop-blur-md lg:hidden">
        <div className="min-w-0 pr-3">
          <p className="truncate text-sm font-semibold text-charcoal">{APP_NAME}</p>
          <p className="truncate text-xs text-muted">{userName}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-2xl p-2 text-charcoal hover:bg-surface"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(100vw-3rem,18rem)] flex-col border-r border-stone-200 bg-surface-elevated transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal">{APP_NAME}</p>
            <p className="truncate text-xs text-muted">{userName}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-2xl p-2 text-charcoal hover:bg-surface"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <AdminNavContent onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
