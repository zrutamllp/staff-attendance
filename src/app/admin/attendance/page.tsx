"use client";

import type {
  AttendancePickerState,
  GrantModalState,
  AttendanceEditPolicyState,
} from "@/types/views";
import type { AttendanceGridRow } from "@/types/views";
import type { FlashMessage } from "@/types/ui";
import type { AttendanceStatus } from "@/types/session";
import { getErrorMessage } from "@/lib/errors";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import MonthSelector, {
  DayStrip,
} from "@/features/attendance/components/MonthSelector";
import LoadingSpinner, {
  EmptyState,
  ErrorState,
  Toast,
} from "@/components/ui/UIStates";
import AttendanceLedgerTable from "@/features/attendance/components/AttendanceLedgerTable";
import AttendanceMarkingList from "@/features/attendance/components/AttendanceMarkingList";
import AttendanceStatusPicker from "@/features/attendance/components/AttendanceStatusPicker";
import LeaveGrantModal from "@/features/attendance/components/LeaveGrantModal";
import { useOptimisticAttendance } from "@/features/attendance/hooks/useOptimisticAttendance";

export default function AdminAttendancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [viewMode, setViewMode] = useState("mark");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<FlashMessage | null>(null);
  const [picker, setPicker] = useState<AttendancePickerState | null>(null);
  const [grantModal, setGrantModal] = useState<GrantModalState | null>(null);
  const [editPolicy, setEditPolicy] = useState<AttendanceEditPolicyState | null>(null);
  const [search, setSearch] = useState("");

  const { grid, setInitialGrid, applyStatus, isPending } = useOptimisticAttendance();

  const refreshGrid = useCallback(async () => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    const res = await fetch(`/api/attendance?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setInitialGrid(data.grid);
    setEditPolicy(data.editPolicy ?? null);
  }, [year, month, setInitialGrid]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshGrid();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [refreshGrid]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelectStatus(code) {
    if (!picker) return;
    const { employee, date } = picker;
    setPicker(null);

    try {
      await applyStatus(employee.id, date, code);
    } catch (err) {
      const apiErr = err as Error & { code?: string | null };
      if (
        (apiErr.code === "WEEKLY_LEAVE_LIMIT" && code === "L") ||
        (apiErr.code === "SICK_LEAVE_LIMIT" && code === "SL")
      ) {
        setGrantModal({
          employee,
          date,
          type: code === "SL" ? "SL" : "L",
          pendingCode: code,
          message: apiErr.message,
        });
        return;
      }
      setToast({
        message: getErrorMessage(
          apiErr,
          "Attendance couldn't be saved. Please try again."
        ),
        type: "error",
      });
    }
  }

  async function handleGrantCreated() {
    if (!grantModal) return;
    const { employee, date, pendingCode } = grantModal;
    setGrantModal(null);
    if (!pendingCode) return;

    try {
      await applyStatus(employee.id, date, pendingCode as AttendanceStatus);
      setToast({
        message: "Extra leave granted and attendance saved",
        type: "success",
      });
    } catch (err) {
      setToast({
        message: getErrorMessage(
          err,
          "Attendance couldn't be saved. Please try again."
        ),
        type: "error",
      });
    }
  }

  function handleMonthChange(y, m) {
    setYear(y);
    setMonth(m);
    const daysInMonth = new Date(y, m, 0).getDate();
    if (selectedDay > daysInMonth) setSelectedDay(daysInMonth);
  }

  return (
    <div className="admin-page">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Attendance</h1>
          <p className="text-sm text-muted">
            Correct attendance within the last 7 days — older dates are locked
          </p>
        </div>
        <Link
          href="/admin/employees/add"
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Employee
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setViewMode("mark")}
          className={`rounded-full px-4 py-2 text-xs font-medium ${
            viewMode === "mark" ? "bg-charcoal text-white" : "bg-surface text-muted"
          }`}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => setViewMode("org")}
          className={`rounded-full px-4 py-2 text-xs font-medium ${
            viewMode === "org" ? "bg-charcoal text-white" : "bg-surface text-muted"
          }`}
        >
          Organization View
        </button>
      </div>

      <div className="mb-6">
        <MonthSelector year={year} month={month} onChange={handleMonthChange} />
      </div>

      {viewMode === "mark" && (
        <DayStrip
          year={year}
          month={month}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      )}

      {!loading && !error && grid.length > 0 && viewMode === "mark" && (
        <div className="relative mb-6">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-field"
          />
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading attendance..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : grid.length === 0 ? (
        <EmptyState
          title="No active employees"
          description="No active employees in the organization."
          action={
            <Link href="/admin/employees/add" className="btn-primary">
              Add Employee
            </Link>
          }
        />
      ) : viewMode === "mark" ? (
        <div className="mt-6">
          <AttendanceMarkingList
            grid={grid}
            year={year}
            month={month}
            selectedDay={selectedDay}
            onOpenPicker={setPicker}
            isPending={isPending}
            editPolicy={editPolicy}
            searchQuery={search}
          />
        </div>
      ) : (
        <div className="mt-6">
          <AttendanceLedgerTable grid={grid} year={year} month={month} />
        </div>
      )}

      {viewMode === "mark" && grid.length > 0 && (
        <div className="card mt-6">
          <h2 className="mb-3 text-sm font-semibold">Monthly Totals</h2>
          <p className="table-scroll-hint">Swipe horizontally to see all columns</p>
          <div className="table-scroll">
          <table className="w-full min-w-[400px] text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-muted">
                <th className="py-2 pr-4">Employee</th>
                <th className="px-2 py-2">P</th>
                <th className="px-2 py-2">A</th>
                <th className="px-2 py-2">L</th>
                <th className="px-2 py-2">SL</th>
                <th className="px-2 py-2">H</th>
                <th className="px-2 py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {grid
                .filter(({ employee }) =>
                  employee.name.toLowerCase().includes(search.trim().toLowerCase())
                )
                .map(({ employee, totals }) => (
                  <tr key={employee.id} className="border-b border-stone-100">
                    <td className="py-2.5 pr-4 font-medium">{employee.name}</td>
                    <td className="px-2 py-2.5">{totals.P}</td>
                    <td className="px-2 py-2.5">{totals.A}</td>
                    <td className="px-2 py-2.5">{totals.L}</td>
                    <td className="px-2 py-2.5">{totals.SL ?? 0}</td>
                    <td className="px-2 py-2.5">{totals.H}</td>
                    <td className="px-2 py-2.5 font-semibold">{totals.percentage}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {picker && (
        <AttendanceStatusPicker
          employee={picker.employee}
          date={picker.date}
          storedStatus={picker.storedStatus}
          onSelect={handleSelectStatus}
          onClose={() => setPicker(null)}
        />
      )}

      {grantModal && (
        <LeaveGrantModal
          employee={grantModal.employee}
          date={grantModal.date}
          type={grantModal.type}
          message={grantModal.message}
          onCancel={() => setGrantModal(null)}
          onGranted={handleGrantCreated}
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
