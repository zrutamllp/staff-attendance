import { calculateTotals } from "@/lib/attendance";
import type { AttendanceStatus, UserRole } from "@/types/session";
import type { AttendanceGridRow } from "@/types/views";

export const PICKER_STATUSES: Array<{
  code: AttendanceStatus;
  label: string;
  stored: AttendanceStatus | null;
}> = [
  { code: "P", label: "Present", stored: null },
  { code: "A", label: "Absent", stored: "A" },
  { code: "L", label: "Leave", stored: "L" },
  { code: "SL", label: "Sick leave", stored: "SL" },
  { code: "H", label: "Half-day", stored: "H" },
];

export function storedFromPickerCode(code: AttendanceStatus): AttendanceStatus | null {
  const option = PICKER_STATUSES.find((s) => s.code === code);
  return option ? option.stored : null;
}

export function applyGridStatusUpdate(
  grid: AttendanceGridRow[],
  employeeId: string,
  date: string,
  newStored: AttendanceStatus | null
): AttendanceGridRow[] {
  return grid.map((row) => {
    if (row.employee.id !== employeeId) return row;
    const days = row.days.map((d) =>
      d.date === date ? { ...d, status: newStored } : d
    );
    return {
      ...row,
      days,
      totals: calculateTotals(days),
    };
  });
}

export async function saveAttendanceStatus(
  employeeId: string,
  date: string,
  status: AttendanceStatus | null
) {
  const res = await fetch("/api/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId, date, status }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || "Failed to save attendance") as Error & {
      code?: string | null;
    };
    err.code = data.code ?? null;
    throw err;
  }

  return res.json();
}

export function shouldConfirmAttendanceOverwrite({
  role,
  userId,
  lastChangedBy,
  storedStatus,
  pickerCode,
}: {
  role: UserRole;
  userId: string;
  lastChangedBy?: string | null;
  storedStatus?: AttendanceStatus | null;
  pickerCode: AttendanceStatus;
}): boolean {
  const newStored = storedFromPickerCode(pickerCode);
  if ((storedStatus ?? null) === (newStored ?? null)) return false;
  if (role !== "manager") return false;
  if (!lastChangedBy || lastChangedBy === userId) return false;
  return true;
}
