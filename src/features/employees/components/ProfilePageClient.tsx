"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import ViewportPage from "@/components/layout/ViewportPage";

interface ProfileUser {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string;
  organizationName?: string | null;
}

interface ProfilePageClientProps {
  user: ProfileUser;
}

export default function ProfilePageClient({ user }: ProfilePageClientProps) {
  return (
    <ViewportPage
      header={
        <header>
          <h1 className="text-xl font-semibold text-charcoal md:text-2xl">Profile</h1>
          <p className="text-sm text-muted">Your account details</p>
        </header>
      }
    >
      <div className="card space-y-3 !p-3 md:!p-4">
        <div>
          <p className="text-xs text-muted">Name</p>
          <p className="font-medium">{user.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted">
            {user.role === "manager" ? "Phone" : "Email"}
          </p>
          <p className="font-medium">
            {user.phone ? user.phone : (user.email ?? "—")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Role</p>
          <p className="font-medium capitalize">{user.role?.replace("_", " ")}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Organization</p>
          <p className="font-medium">{user.organizationName}</p>
        </div>
      </div>

      {user.role === "master_admin" && (
        <a href="/admin/overview" className="btn-secondary block shrink-0 text-center !py-2.5">
          Open Admin Dashboard
        </a>
      )}

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="btn-secondary flex w-full shrink-0 items-center justify-center gap-2 !py-2.5 text-absent"
      >
        <LogOut size={18} />
        Logout
      </button>
    </ViewportPage>
  );
}
