"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import type { Employee } from "@/types/domain";
import type { ManagerListRow } from "@/types/views";

interface RestoreEmployeeModalProps {
  employee: Employee | null;
  managers?: ManagerListRow[];
  showManagerSelect?: boolean;
  onCancel: () => void;
  onRestore: (payload: { joiningDate: string; managerId?: string }) => Promise<void>;
}

export default function RestoreEmployeeModal({
  employee,
  managers = [],
  showManagerSelect = false,
  onCancel,
  onRestore,
}: RestoreEmployeeModalProps) {
  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [managerId, setManagerId] = useState(employee?.currentManagerId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      await onRestore({
        joiningDate,
        managerId: showManagerSelect ? managerId : undefined,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to restore employee"));
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <h2 className="text-lg font-semibold">Restore {employee?.name}?</h2>
        <p className="mt-2 text-sm text-muted">
          Returns this employee to the active roster with a new join date.
          {employee?.exitDate && <> Previous exit: {employee.exitDate}.</>}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted">New join date</label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="input-field"
            />
          </div>

          {showManagerSelect && managers.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs text-muted">
                Assign to manager
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="input-field"
              >
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-absent">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !joiningDate}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? "Restoring..." : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}
