"use client";

import type { EmployeeDetailData } from "@/types/views";
import type { EmployeeDetailResponse } from "@/types/domain";
import type { FlashMessage } from "@/types/ui";
import { getErrorMessage } from "@/lib/errors";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LoadingSpinner, { ErrorState, Toast } from "@/components/ui/UIStates";
import RestoreEmployeeModal from "@/features/employees/components/RestoreEmployeeModal";
import EmployeeAdvancesSection from "@/features/employees/components/EmployeeAdvancesSection";
import { formatTenure } from "@/lib/attendance";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeDetailResponse | null>(null);
  const [history, setHistory] = useState<EmployeeDetailData["history"] | null>(null);
  const [assignments, setAssignments] = useState<
    NonNullable<EmployeeDetailData["assignments"]>
  >([]);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [exitDate, setExitDate] = useState(new Date().toISOString().split("T")[0]);
  const [exitTime, setExitTime] = useState(new Date().toTimeString().slice(0, 5));
  const [toast, setToast] = useState<FlashMessage | null>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [showRestore, setShowRestore] = useState(false);

  async function loadEmployee() {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) throw new Error("Employee not found");
      const data = await res.json();
      setEmployee(data);
      setEditName(data.name);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    const res = await fetch(`/api/employees/${id}/history?year=${historyYear}`);
    if (res.ok) {
      const data = await res.json();
      setHistory(data.attendance);
      setAssignments(data.assignments.history ?? []);
    }
  }

  useEffect(() => {
    loadEmployee();
  }, [id]);

  useEffect(() => {
    if (id) loadHistory();
  }, [id, historyYear]);

  async function handleExit() {
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "exit", exitDate, exitTime: `${exitTime}:00` }),
    });
    if (res.ok) {
      setShowExit(false);
      setToast({ message: "Employee moved to Exited Staff", type: "success" });
      setTimeout(() => router.push("/manager/employees?filter=exited"), 1200);
    }
  }

  async function handleRestore({ joiningDate }) {
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reactivate", joiningDate }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to restore employee");
    }
    setShowRestore(false);
    loadEmployee();
    loadHistory();
    setToast({ message: "Employee restored to active roster", type: "success" });
  }

  async function handleSaveEdit() {
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) {
      setEditing(false);
      loadEmployee();
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "This permanently deletes the employee and associated records. This cannot be undone."
      )
    ) {
      return;
    }
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/manager/employees");
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="page-container">
        <ErrorState message={error || "Not found"} />
      </div>
    );
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

      <div className="card">
        <div className="flex items-start justify-between">
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input-field"
            />
          ) : (
            <div>
              <h1 className="text-2xl font-semibold text-charcoal">{employee.name}</h1>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  employee.status === "active"
                    ? "bg-green-100 text-present"
                    : "bg-stone-200 text-muted"
                }`}
              >
                {employee.status}
              </span>
            </div>
          )}
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Join Date</dt>
            <dd>{employee.joiningDate}</dd>
          </div>
          {employee.exitDate && (
            <div className="flex justify-between">
              <dt className="text-muted">Exit Date</dt>
              <dd>{employee.exitDate}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Tenure</dt>
            <dd>{formatTenure(employee.joiningDate, employee.exitDate)}</dd>
          </div>
          {employee.leaveBalances && (
            <>
              <div className="flex justify-between">
                <dt className="text-muted">Weekly leave</dt>
                <dd>
                  {employee.leaveBalances.weeklyLeave.used}/
                  {employee.leaveBalances.weeklyLeave.quota} this week
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Sick leave</dt>
                <dd>
                  {employee.leaveBalances.sickLeave.used}/
                  {employee.leaveBalances.sickLeave.quota} in{" "}
                  {employee.leaveBalances.sickLeave.year}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {(employee.leaveGrants?.length ?? 0) > 0 && (
        <div className="card">
          <h2 className="mb-4 font-semibold">Extra Leave Grants</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-muted">
                  <th className="py-2 pr-4">Type</th>
                  <th className="px-2 py-2">From</th>
                  <th className="px-2 py-2">To</th>
                  <th className="px-2 py-2">Granted by</th>
                  <th className="px-2 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {(employee.leaveGrants ?? []).map((grant) => (
                  <tr key={grant.id} className="border-b border-stone-100">
                    <td className="py-2 pr-4">
                      {grant.type === "SL" ? "Sick leave" : "Leave"}
                    </td>
                    <td className="px-2 py-2">{grant.startDate}</td>
                    <td className="px-2 py-2">{grant.endDate}</td>
                    <td className="px-2 py-2">{grant.grantedByName}</td>
                    <td className="px-2 py-2">
                      {grant.createdAt instanceof Date
                        ? grant.createdAt.toISOString().slice(0, 10)
                        : String(grant.createdAt).slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EmployeeAdvancesSection
        employeeId={employee.id}
        employeeName={employee.name}
        advances={employee.advances ?? []}
        advanceSummary={employee.advanceSummary}
        onUpdated={loadEmployee}
      />

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Attendance History</h2>
          <select
            value={historyYear}
            onChange={(e) => setHistoryYear(parseInt(e.target.value, 10))}
            className="rounded-xl border border-stone-200 px-3 py-1.5 text-sm"
          >
            {[0, 1, 2].map((offset) => {
              const y = new Date().getFullYear() - offset;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>
        {history?.months ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-muted">
                  <th className="py-2 pr-4">Month</th>
                  <th className="px-2 py-2">P</th>
                  <th className="px-2 py-2">A</th>
                  <th className="px-2 py-2">L</th>
                  <th className="px-2 py-2">SL</th>
                  <th className="px-2 py-2">H</th>
                  <th className="px-2 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {history.months.map((m) => (
                  <tr key={m.month} className="border-b border-stone-100">
                    <td className="py-2 pr-4">{MONTHS[m.month - 1]}</td>
                    <td className="px-2 py-2">{m.P}</td>
                    <td className="px-2 py-2">{m.A}</td>
                    <td className="px-2 py-2">{m.L}</td>
                    <td className="px-2 py-2">{m.SL ?? 0}</td>
                    <td className="px-2 py-2">{m.H}</td>
                    <td className="px-2 py-2 font-semibold">{m.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No attendance history for this year.</p>
        )}
      </div>

      <div className="space-y-3">
        {editing ? (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditName(employee.name);
                setEditing(false);
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button onClick={handleSaveEdit} className="btn-primary flex-1">
              Save
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-secondary w-full">
            Edit Employee
          </button>
        )}

        {employee.status === "active" ? (
          <button onClick={() => setShowExit(true)} className="btn-secondary w-full">
            Mark as Exited
          </button>
        ) : (
          <button onClick={() => setShowRestore(true)} className="btn-primary w-full">
            Restore Employee
          </button>
        )}

        <button onClick={handleDelete} className="btn-danger w-full">
          Delete Employee
        </button>
      </div>

      {showExit && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2 className="text-lg font-semibold">Mark {employee.name} as exited?</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted">Exit date</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted">Exit time</label>
                <input
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowExit(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleExit} className="btn-primary flex-1">
                Mark as Exited
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestore && (
        <RestoreEmployeeModal
          employee={employee}
          onCancel={() => setShowRestore(false)}
          onRestore={handleRestore}
        />
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
