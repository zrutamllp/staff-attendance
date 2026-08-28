"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import LoadingSpinner from "@/components/ui/UIStates";
import type { SessionProfile } from "@/types/views";

export default function AdminSettingsPage() {
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        setSession(s);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="p-8">
        <LoadingSpinner />
      </div>
    );

  const user = session?.user;

  return (
    <div className="admin-page">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">Settings</h1>
        <p className="text-sm text-muted">Account and organization settings</p>
      </header>

      <div className="max-w-lg card space-y-4">
        <div>
          <p className="text-xs text-muted">Name</p>
          <p className="font-medium">{user?.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted">
            {user?.role === "manager" ? "Phone" : "Email"}
          </p>
          <p className="font-medium">
            {user?.phone ? user.phone : (user?.email ?? "—")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Role</p>
          <p className="font-medium capitalize">{user?.role?.replace("_", " ")}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Organization</p>
          <p className="font-medium">{user?.organizationName}</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-secondary w-full text-absent"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
