"use client";

import type { ManagerListRow } from "@/types/views";
import type { FlashMessage } from "@/types/ui";
import { getErrorMessage } from "@/lib/errors";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, UserCog } from "lucide-react";
import LoadingSpinner, { ErrorState, Toast } from "@/components/ui/UIStates";
import { formatPhone } from "@/lib/phone";

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<ManagerListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [toast, setToast] = useState<FlashMessage | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) throw new Error("Failed to load managers");
      setManagers(await res.json());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form }),
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ name: "", phone: "", password: "" });
      load();
      setToast({ message: "Manager created", type: "success" });
    } else {
      const data = await res.json();
      setToast({ message: data.error, type: "error" });
    }
  }

  async function handleDeactivate(managerId, name) {
    if (!confirm(`Deactivate ${name}?\n\nThey will no longer be able to sign in.`)) {
      return;
    }
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate", managerId }),
    });
    if (res.ok) {
      load();
      setToast({ message: "Manager deactivated", type: "success" });
    }
  }

  async function handleReactivate(managerId) {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reactivate-manager", managerId }),
    });
    load();
  }

  return (
    <div className="admin-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Managers</h1>
          <p className="text-sm text-muted">Manage organization managers</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Manager
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {managers.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface">
                  <UserCog size={22} className="text-muted" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    <Link href={`/admin/managers/${m.id}`} className="hover:underline">
                      {m.name}
                    </Link>
                  </p>
                  <p className="text-xs text-muted">
                    {m.phone ? formatPhone(m.phone) : (m.email ?? "—")}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className="text-xs text-muted capitalize">{m.status}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {m.status === "active" ? (
                  <button
                    onClick={() => handleDeactivate(m.id, m.name)}
                    className="btn-secondary flex-1 text-xs"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivate(m.id)}
                    className="btn-primary flex-1 text-xs"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md rounded-3xl bg-surface-elevated p-6"
          >
            <h2 className="text-lg font-semibold">Add Manager</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Name
                </label>
                <input
                  placeholder="Manager name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                  inputMode="numeric"
                  pattern="[0-9+\s-]{10,15}"
                  required
                />
                <p className="mt-1 text-xs text-muted">
                  Manager will log in using this phone number
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Set login password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1">
                Add Manager
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
