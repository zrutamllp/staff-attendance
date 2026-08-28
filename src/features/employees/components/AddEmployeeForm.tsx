"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Toast } from "@/components/ui/UIStates";
import FutureJoinDateNotice from "@/features/employees/components/FutureJoinDateNotice";
import { getLocalDateString } from "@/lib/auto-present";
import { getErrorMessage } from "@/lib/errors";
import type { FlashMessage } from "@/types/ui";
import type { Employee } from "@/types/domain";

interface AddEmployeeFormProps {
  onSuccess?: (employee: Employee) => void;
  onCancel?: () => void;
  cancelHref?: string;
  submitLabel?: string;
}

export default function AddEmployeeForm({
  onSuccess,
  onCancel,
  cancelHref,
  submitLabel = "Add Employee",
}: AddEmployeeFormProps) {
  const [name, setName] = useState("");
  const [joiningDate, setJoiningDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<FlashMessage | null>(null);

  async function handleSubmit(e: FormEvent) {
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

      const employee = (await res.json()) as Employee;
      onSuccess?.(employee);
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Employee Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Full name"
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
          <FutureJoinDateNotice joiningDate={joiningDate} />
        </div>

        <p className="text-xs text-muted">
          Employees belong to the organization. All managers can view and mark
          attendance for every employee. Saturday and Sunday are working days — mark
          only exceptions (absent, leave, half-day).
        </p>

        <div className="flex gap-3 pt-1">
          {onCancel ? (
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
          ) : cancelHref ? (
            <Link href={cancelHref} className="btn-secondary flex-1 text-center">
              Cancel
            </Link>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? "Adding..." : submitLabel}
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
    </>
  );
}
