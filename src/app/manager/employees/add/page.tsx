"use client";

import type { FlashMessage } from "@/types/ui";
import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Toast } from "@/components/ui/UIStates";
import FutureJoinDateNotice from "@/features/employees/components/FutureJoinDateNotice";
import { getLocalDateString } from "@/lib/auto-present";

export default function AddEmployeePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joiningDate, setJoiningDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<FlashMessage | null>(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, joiningDate }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add employee");
      }

      router.push("/manager/employees");
      router.refresh();
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container space-y-6">
      <Link
        href="/manager/employees"
        className="inline-flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-charcoal">Add Employee</h1>
        <p className="text-sm text-muted">Enter employee details</p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Employee name"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Joining Date
          </label>
          <input
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            className="input-field"
            required
          />
          <div className="mt-2">
            <FutureJoinDateNotice joiningDate={joiningDate} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/manager/employees" className="btn-secondary flex-1 text-center">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Employee"}
          </button>
        </div>
      </form>

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
