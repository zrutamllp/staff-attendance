"use client";

import PaginationControls from "@/components/ui/PaginationControls";
import { useViewportPagination } from "@/hooks/useViewportPagination";
import StatusStamp from "@/features/attendance/components/StatusStamp";
import { toDateString } from "@/lib/attendance";
import type { AttendanceGridRow, AttendanceEditPolicyState } from "@/types/views";

interface AttendanceMarkingListProps {
  grid: AttendanceGridRow[];
  year: number;
  month: number;
  selectedDay: number;
  onOpenPicker: (payload: {
    employee: AttendanceGridRow["employee"];
    date: string;
    storedStatus: AttendanceGridRow["days"][number]["status"];
    lastChangedBy?: string | null;
    lastChangedByName?: string | null;
  }) => void;
  isPending?: (employeeId: string, date: string) => boolean;
  editPolicy: AttendanceEditPolicyState | null;
  searchQuery?: string;
}

export default function AttendanceMarkingList({
  grid,
  year,
  month,
  selectedDay,
  onOpenPicker,
  isPending,
  editPolicy,
  searchQuery = "",
}: AttendanceMarkingListProps) {
  const date = toDateString(year, month, selectedDay);
  const query = searchQuery.trim().toLowerCase();

  const visibleRows = grid.filter(({ employee, days }) => {
    const dayRecord = days.find((d) => d.date === date);
    if (dayRecord?.employed === false) return false;
    if (query && !employee.name.toLowerCase().includes(query)) return false;
    return true;
  });

  const pagination = useViewportPagination<AttendanceGridRow>(visibleRows);

  const sampleDay = grid[0]?.days.find((d) => d.date === date);
  const isLocked = sampleDay?.employed !== false && sampleDay?.editable === false;

  if (visibleRows.length === 0) {
    const hasRosterToday = grid.some(({ days }) => {
      const dayRecord = days.find((d) => d.date === date);
      return dayRecord?.employed !== false;
    });

    return (
      <p className="text-sm text-muted">
        {query && hasRosterToday
          ? "No employees match your search."
          : "No employees on roster for this date yet."}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      {isLocked && editPolicy && (
        <p className="shrink-0 rounded-2xl bg-stone-100 px-3 py-2 text-xs text-muted">
          {editPolicy.role === "master_admin"
            ? `This date is locked — Master Admin can only edit the last ${editPolicy.adminWindowDays} days.`
            : "This date is locked — managers can only edit today's attendance."}
        </p>
      )}
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
        {pagination.paginatedItems.map(({ employee, days, totals }) => {
          const dayRecord = days.find((d) => d.date === date) as
            | (AttendanceGridRow["days"][number] & {
                lastChangedBy?: string | null;
                lastChangedByName?: string | null;
              })
            | undefined;
          const pending = isPending?.(employee.id, date);
          const canEdit = dayRecord?.editable !== false;

          return (
            <div
              key={employee.id}
              className="card flex items-center justify-between !p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal">{employee.name}</p>
                <p className="text-xs text-muted">{totals.percentage}% this month</p>
              </div>
              <div className="relative shrink-0">
                <StatusStamp
                  status={dayRecord?.status ?? null}
                  date={dayRecord?.date ?? date}
                  onClick={
                    canEdit
                      ? () =>
                          onOpenPicker({
                            employee,
                            date,
                            storedStatus: dayRecord?.status ?? null,
                            lastChangedBy: dayRecord?.lastChangedBy ?? null,
                            lastChangedByName: dayRecord?.lastChangedByName ?? null,
                          })
                      : undefined
                  }
                  locked={!canEdit}
                />
                {pending && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500"
                    aria-hidden
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        hasPrev={pagination.hasPrev}
        hasNext={pagination.hasNext}
        onPrev={pagination.prev}
        onNext={pagination.next}
      />
    </div>
  );
}
