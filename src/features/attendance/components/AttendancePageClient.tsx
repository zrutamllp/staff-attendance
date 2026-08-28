"use client";

import type {
  AttendancePickerState,
  GrantModalState,
  OverwriteModalState,
  AttendanceEditPolicyState,
  AttendanceGridRow,
} from "@/types/views";
import type { FlashMessage } from "@/types/ui";
import type { AttendanceStatus } from "@/types/session";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import ViewportPage from "@/components/layout/ViewportPage";
import MonthSelector, {
  DayStrip,
} from "@/features/attendance/components/MonthSelector";
import { EmptyState, ErrorState, Toast } from "@/components/ui/UIStates";
import AttendanceMarkingList from "@/features/attendance/components/AttendanceMarkingList";
import { useOptimisticAttendance } from "@/features/attendance/hooks/useOptimisticAttendance";
import { shouldConfirmAttendanceOverwrite } from "@/features/attendance/lib/attendance-client";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import Link from "next/link";

const AttendanceStatusPicker = dynamic(
  () => import("@/features/attendance/components/AttendanceStatusPicker"),
  { ssr: false }
);
const LeaveGrantModal = dynamic(
  () => import("@/features/attendance/components/LeaveGrantModal"),
  { ssr: false }
);
const AttendanceOverwriteModal = dynamic(
  () => import("@/features/attendance/components/AttendanceOverwriteModal"),
  { ssr: false }
);

interface AttendanceGridPayload {
  grid: AttendanceGridRow[];
  editPolicy: AttendanceEditPolicyState;
}

interface AttendancePageClientProps {
  initialYear: number;
  initialMonth: number;
  initialData: AttendanceGridPayload;
}

export default function AttendancePageClient({
  initialYear,
  initialMonth,
  initialData,
}: AttendancePageClientProps) {
  const { data: session } = useSession();
  const now = new Date();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [toast, setToast] = useState<FlashMessage | null>(null);
  const [picker, setPicker] = useState<AttendancePickerState | null>(null);
  const [grantModal, setGrantModal] = useState<GrantModalState | null>(null);
  const [overwriteModal, setOverwriteModal] = useState<OverwriteModalState | null>(
    null
  );
  const [search, setSearch] = useState("");

  const { grid, setInitialGrid, applyStatus, isPending } = useOptimisticAttendance();

  const cacheKey = `attendance:${year}:${month}`;
  const fetchGrid = useCallback(async () => {
    const res = await fetch(`/api/attendance?year=${year}&month=${month}`);
    if (!res.ok) throw new Error("Failed to load attendance");
    const json = await res.json();
    return {
      grid: json.grid as AttendanceGridRow[],
      editPolicy: json.editPolicy as AttendanceEditPolicyState,
    };
  }, [year, month]);

  const useInitial =
    year === initialYear && month === initialMonth ? initialData : undefined;

  const { data: payload, error, isRefreshing, isInitialLoading, refresh } =
    useCachedFetch(cacheKey, fetchGrid, { initialData: useInitial });

  useEffect(() => {
    if (payload?.grid) {
      setInitialGrid(payload.grid);
    }
  }, [payload, setInitialGrid]);

  const editPolicy = payload?.editPolicy ?? initialData.editPolicy;
  const actor = useMemo(
    () =>
      session?.user?.id && session.user.name
        ? { id: session.user.id, name: session.user.name }
        : undefined,
    [session?.user?.id, session?.user?.name]
  );

  async function saveStatus(
    employee: AttendancePickerState["employee"],
    date: string,
    code: AttendanceStatus
  ) {
    try {
      await applyStatus(employee.id, date, code, actor);
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

  async function handleSelectStatus(code: AttendanceStatus) {
    if (!picker) return;
    const { employee, date, storedStatus, lastChangedBy, lastChangedByName } = picker;

    if (
      shouldConfirmAttendanceOverwrite({
        role: session?.user?.role ?? "manager",
        userId: session?.user?.id ?? "",
        lastChangedBy,
        storedStatus,
        pickerCode: code,
      })
    ) {
      setOverwriteModal({
        employee,
        date,
        storedStatus,
        nextStatus: code,
        pendingCode: code,
        lastChangedByName,
        currentStoredStatus: storedStatus,
      });
      setPicker(null);
      return;
    }

    setPicker(null);
    await saveStatus(employee, date, code);
  }

  async function handleOverwriteConfirm() {
    if (!overwriteModal) return;
    const { employee, date, pendingCode } = overwriteModal;
    setOverwriteModal(null);
    if (pendingCode) await saveStatus(employee, date, pendingCode);
  }

  async function handleGrantCreated() {
    if (!grantModal) return;
    const { employee, date, pendingCode } = grantModal;
    setGrantModal(null);
    if (!pendingCode) return;
    try {
      await applyStatus(employee.id, date, pendingCode as import("@/types/session").AttendanceStatus, actor);
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

  function handleMonthChange(y: number, m: number) {
    setYear(y);
    setMonth(m);
    const daysInMonth = new Date(y, m, 0).getDate();
    if (selectedDay > daysInMonth) setSelectedDay(daysInMonth);
  }

  return (
    <ViewportPage
      header={
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-charcoal md:text-2xl">Attendance</h1>
            <p className="text-sm text-muted">
              Tap a status to pick Present, Absent, Leave, or Sick leave — today only
            </p>
          </div>
          <Link
            href="/manager/reports"
            className="shrink-0 text-xs font-medium text-present hover:underline md:text-sm"
          >
            View report →
          </Link>
        </header>
      }
    >
      <div className="shrink-0 space-y-2">
        <MonthSelector year={year} month={month} onChange={handleMonthChange} />
        <DayStrip
          year={year}
          month={month}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>

      {grid.length > 0 && (
        <div className="relative shrink-0">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-field !py-2.5"
          />
        </div>
      )}

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity ${isRefreshing ? "opacity-70" : ""}`}
      >
        {isInitialLoading ? null : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : grid.length === 0 ? (
          <EmptyState
            title="No active employees"
            description="Add employees to start marking attendance."
            action={
              <Link href="/manager/employees/add" className="btn-primary">
                Add Employee
              </Link>
            }
          />
        ) : (
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
        )}
      </div>

      {picker && (
        <AttendanceStatusPicker
          employee={picker.employee}
          date={picker.date}
          storedStatus={picker.storedStatus}
          onSelect={handleSelectStatus}
          onClose={() => setPicker(null)}
        />
      )}

      {overwriteModal && (
        <AttendanceOverwriteModal
          employee={overwriteModal.employee}
          date={overwriteModal.date}
          pendingCode={overwriteModal.pendingCode}
          lastChangedByName={overwriteModal.lastChangedByName}
          currentStoredStatus={overwriteModal.currentStoredStatus}
          onCancel={() => setOverwriteModal(null)}
          onConfirm={handleOverwriteConfirm}
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
    </ViewportPage>
  );
}
