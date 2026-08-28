"use client";

import type { ManagerDetailData } from "@/types/views";
import type { FlashMessage } from "@/types/ui";
import { getErrorMessage } from "@/lib/errors";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LoadingSpinner, { ErrorState, Toast } from "@/components/ui/UIStates";
import { formatPhone } from "@/lib/phone";

export default function ManagerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [manager, setManager] = useState<ManagerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<FlashMessage | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?type=manager&id=${id}`);
      if (!res.ok) throw new Error("Manager not found");
      const data = await res.json();
      setManager(data);
      setForm({ name: data.name, phone: data.phone ?? "", password: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload: {
      action: string;
      managerId: string | string[];
      name: string;
      phone: string;
      password?: string;
    } = { action: "update", managerId: String(id), name: form.name, phone: form.phone };
    if (form.password) payload.password = form.password;

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setToast({ message: "Manager updated", type: "success" });
      load();
    } else {
      setToast({ message: data.error, type: "error" });
    }
  }

  async function handleDeactivate() {
    if (
      !confirm(
        `Deactivate ${manager?.name ?? "this manager"}?\n\nThey will no longer be able to sign in.`
      )
    ) {
      return;
    }
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate", managerId: id }),
    });
    if (res.ok) {
      router.push("/admin/managers");
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !manager) {
    return (
      <div className="p-8">
        <ErrorState message={error || "Not found"} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Link
        href="/admin/managers"
        className="inline-flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft size={16} />
        Back to Managers
      </Link>

      <header className="mt-6 mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">{manager.name}</h1>
        <p className="text-sm text-muted">
          {manager.phone ? formatPhone(manager.phone) : manager.email} ·{" "}
          <span className="capitalize">{manager.status}</span>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Organization active employees</dt>
              <dd>{manager.activeCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">This month attendance</dt>
              <dd>{manager.monthTotals?.percentage ?? 0}%</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={handleSave} className="card space-y-3">
          <h2 className="font-semibold">Edit Manager</h2>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
            placeholder="Name"
            required
          />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input-field"
            placeholder="Phone"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input-field"
            placeholder="New password (optional)"
          />
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 font-semibold">Organization Employees</h2>
        {manager.employees?.length ? (
          <ul className="space-y-2 text-sm">
            {manager.employees.map((e) => (
              <li
                key={e.id}
                className="flex justify-between rounded-2xl bg-surface px-4 py-3"
              >
                <Link href={`/manager/employees/${e.id}`} className="hover:underline">
                  {e.name}
                </Link>
                <span className="capitalize text-muted">{e.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No employees assigned.</p>
        )}
      </div>

      {manager.status === "active" && (
        <button onClick={handleDeactivate} className="btn-danger mt-6">
          Deactivate Manager
        </button>
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
