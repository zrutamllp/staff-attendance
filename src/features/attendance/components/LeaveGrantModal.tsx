"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import DateInputField from "@/components/ui/DateInputField";

const TYPE_LABELS = {
  L: "Leave",
  SL: "Sick leave",
};

export default function LeaveGrantModal({
  employee,
  date,
  type,
  message,
  onCancel,
  onGranted,
}) {
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGrant() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employee.id}/leave-grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          startDate,
          endDate,
          forDate: date,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to grant extra leave");
      }

      await onGranted();
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <h2 className="text-lg font-semibold">{TYPE_LABELS[type]} limit reached</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <p className="mt-2 text-sm">
          Grant extra {TYPE_LABELS[type].toLowerCase()} for{" "}
          <span className="font-medium">{employee.name}</span> so you can mark{" "}
          <span className="font-medium">{date}</span>.
        </p>

        <div className="mt-4 space-y-3">
          <DateInputField
            id="leave-grant-start"
            label="From"
            value={startDate}
            onChange={setStartDate}
          />
          <DateInputField
            id="leave-grant-end"
            label="To"
            value={endDate}
            onChange={setEndDate}
          />
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
            onClick={handleGrant}
            disabled={loading || !startDate || !endDate}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? "Granting..." : "Add more"}
          </button>
        </div>
      </div>
    </div>
  );
}
