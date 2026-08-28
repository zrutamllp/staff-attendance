"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { Plus } from "lucide-react";
import DateInputField from "@/components/ui/DateInputField";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

interface AdvanceRow {
  id: string;
  date: string;
  amount: string;
  givenByName: string;
  notes?: string | null;
}

interface EmployeeAdvancesSectionProps {
  employeeId: string;
  employeeName: string;
  advances?: AdvanceRow[];
  advanceSummary?: {
    monthTotal: number;
    yearTotal: number;
    allTimeTotal: number;
    month: number;
    year: number;
  };
  onUpdated?: () => void | Promise<void>;
}

export default function EmployeeAdvancesSection({
  employeeId,
  employeeName,
  advances = [],
  advanceSummary,
  onUpdated,
}: EmployeeAdvancesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/advances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, date, notes }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to record advance");
      }

      setShowForm(false);
      setAmount("");
      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);
      await onUpdated?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const monthLabel = advanceSummary
    ? `${MONTHS[advanceSummary.month - 1]} ${advanceSummary.year}`
    : null;

  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Extra Money (Advances)</h2>
          {advanceSummary && (
            <p className="mt-1 text-sm text-muted">
              {monthLabel}: {formatMoney(advanceSummary.monthTotal)} · This year:{" "}
              {formatMoney(advanceSummary.yearTotal)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-secondary flex shrink-0 items-center gap-1.5 px-4 py-2 text-xs"
        >
          <Plus size={16} />
          Record
        </button>
      </div>

      {advances.length === 0 ? (
        <p className="text-sm text-muted">
          No extra money recorded yet for {employeeName}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-muted">
                <th className="py-2 pr-4">Date</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Given by</th>
                <th className="px-2 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((advance) => (
                <tr key={advance.id} className="border-b border-stone-100">
                  <td className="py-2 pr-4">{advance.date}</td>
                  <td className="px-2 py-2 font-semibold">
                    {formatMoney(advance.amount)}
                  </td>
                  <td className="px-2 py-2">{advance.givenByName}</td>
                  <td className="px-2 py-2 text-muted">{advance.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {advanceSummary && (
            <p className="mt-3 text-sm font-medium">
              All-time total: {formatMoney(advanceSummary.allTimeTotal)}
            </p>
          )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h3 className="text-lg font-semibold">Record extra money</h3>
            <p className="mt-1 text-sm text-muted">
              Advance given to {employeeName} before month end
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="input-field"
                />
              </div>
              <DateInputField
                id="advance-date"
                label="Date given"
                value={date}
                onChange={setDate}
              />
              <div>
                <label className="mb-1.5 block text-xs text-muted">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason or reference"
                  className="input-field"
                />
              </div>
              <p className="text-xs text-muted">
                Recorded under your name as the person who gave the advance.
              </p>
            </div>

            {error && <p className="mt-3 text-sm text-absent">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !amount || !date}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save advance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
