import {
  getTodayString,
  isBeforeAutoPresentTime,
  resolveReferenceDate,
} from "@/lib/auto-present";
import type { AttendanceStatus, AttendanceTotals, UserRole } from "@/types/session";

export const STATUS_CYCLE: AttendanceStatus[] = ["P", "A", "L", "SL", "H"];

export const SICK_LEAVE_ANNUAL_QUOTA = 6;
export const WEEKLY_LEAVE_QUOTA = 1;
export const ADMIN_EDIT_WINDOW_DAYS = 7;

export const EDIT_LOCK_CODES = {
  MANAGER_TODAY_ONLY: "MANAGER_TODAY_ONLY",
  ATTENDANCE_LOCKED: "ATTENDANCE_LOCKED",
} as const;

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: "Present",
  A: "Absent",
  L: "Leave",
  SL: "Sick leave",
  H: "Half-day",
};

export const STATUS_COLORS: Record<
  AttendanceStatus | "unmarked" | "notEmployed",
  string
> = {
  P: "bg-teal-700 text-white",
  A: "bg-red-700 text-white",
  L: "bg-amber-600 text-white",
  SL: "bg-orange-700 text-white",
  H: "bg-slate-600 text-white",
  unmarked: "bg-transparent border-2 border-stone-300 text-stone-400",
  notEmployed: "bg-transparent text-stone-300",
};

export interface DayRecordInput {
  date: string;
  status: AttendanceStatus | null;
  employed?: boolean;
}

export interface EffectiveStatusOptions {
  employed?: boolean;
  referenceDate?: Date | string;
}

export interface MonthDayOptions {
  joiningDate?: string | null;
  exitDate?: string | null;
}

export interface EmployeeMonthInput {
  id: string;
  joiningDate: string;
  exitDate?: string | null;
}

type AttendanceRecordMap = Record<string, AttendanceStatus | null>;
type EmployeeRecordMap = Record<string, AttendanceRecordMap>;

/** True when date is on or after join and on or before exit (if set). */
export function isEmployedOnDate(
  joiningDate: string | null | undefined,
  exitDate: string | null | undefined,
  dateStr: string
): boolean {
  if (!dateStr) return true;
  if (joiningDate && dateStr < joiningDate) return false;
  if (exitDate && dateStr > exitDate) return false;
  return true;
}

export function daysBetweenDates(fromDateStr: string, toDateStr: string): number {
  const from = new Date(`${fromDateStr}T12:00:00`);
  const to = new Date(`${toDateStr}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Managers: today only. Master admin: last ADMIN_EDIT_WINDOW_DAYS days. Future dates blocked. */
export function canEditAttendanceDate(
  role: UserRole,
  attendanceDate: string,
  referenceDate?: Date | string
): boolean {
  const today = getTodayString(referenceDate);
  if (attendanceDate > today) return false;

  const daysSince = daysBetweenDates(attendanceDate, today);

  if (role === "master_admin") {
    return daysSince <= ADMIN_EDIT_WINDOW_DAYS;
  }

  return daysSince === 0;
}

export function getEditLockMessage(
  role: UserRole,
  attendanceDate: string,
  referenceDate?: Date | string
): string {
  const today = getTodayString(referenceDate);
  if (attendanceDate > today) {
    return "Future dates cannot be edited.";
  }
  if (role === "master_admin") {
    return `Attendance older than ${ADMIN_EDIT_WINDOW_DAYS} days is locked.`;
  }
  return "Managers can only edit today's attendance.";
}

/** Weekends are treated like any other working day (7-day week for all employees). */
export function isNonWorkingDay(): boolean {
  return false;
}

/** Past weekdays default to Present after 10:00 local time today. No future Present. */
export function effectiveStatus(
  storedStatus: AttendanceStatus | null | undefined,
  dateStr: string,
  { employed = true, referenceDate }: EffectiveStatusOptions = {}
): AttendanceStatus | null {
  if (!employed) return null;

  const ref = resolveReferenceDate(referenceDate);
  const today = getTodayString(ref);

  if (dateStr > today) {
    return storedStatus ?? null;
  }

  if (storedStatus && storedStatus !== "P") {
    return storedStatus;
  }

  if (dateStr === today && isBeforeAutoPresentTime(ref)) {
    return null;
  }

  return "P";
}

export function toStoredStatus(
  effectiveStatusValue: AttendanceStatus | null | undefined
): AttendanceStatus | null {
  if (!effectiveStatusValue || effectiveStatusValue === "P") {
    return null;
  }
  return effectiveStatusValue;
}

export function nextStatus(
  currentEffective: AttendanceStatus | null | undefined
): AttendanceStatus {
  const current = currentEffective ?? "P";
  const idx = STATUS_CYCLE.indexOf(current);
  const safeIdx = idx === -1 ? 0 : idx;
  return STATUS_CYCLE[(safeIdx + 1) % STATUS_CYCLE.length];
}

export function isWeekendFromDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  return isWeekend(y, m, d);
}

export function getWeekRange(dateStr: string): [string, string] {
  const date = new Date(`${dateStr}T12:00:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return [format(monday), format(sunday)];
}

export function calculateTotals(
  records: DayRecordInput[],
  { referenceDate }: { referenceDate?: Date | string } = {}
): AttendanceTotals {
  const totals: AttendanceTotals = {
    P: 0,
    A: 0,
    L: 0,
    SL: 0,
    H: 0,
    marked: 0,
    percentage: 0,
  };

  for (const record of records) {
    if (record.employed === false) continue;
    if (isNonWorkingDay()) continue;

    const status = effectiveStatus(record.status, record.date, {
      employed: true,
      referenceDate,
    });
    if (!status) continue;

    totals[status] += 1;
    totals.marked += 1;
  }

  const percentage =
    totals.marked > 0
      ? Math.round(((totals.P + totals.H * 0.5) / totals.marked) * 100)
      : 0;

  return { ...totals, percentage };
}

export function buildEmployeeMonthRows(
  year: number,
  month: number,
  employees: EmployeeMonthInput[],
  recordMap: EmployeeRecordMap = {}
): DayRecordInput[] {
  const rows: DayRecordInput[] = [];

  for (const emp of employees) {
    const empMap = recordMap[emp.id] ?? {};
    rows.push(
      ...buildMonthDayRecords(year, month, empMap, {
        joiningDate: emp.joiningDate,
        exitDate: emp.exitDate,
      })
    );
  }

  return rows;
}

export function buildMonthDayRecords(
  year: number,
  month: number,
  recordMap: AttendanceRecordMap = {},
  { joiningDate, exitDate }: MonthDayOptions = {}
): DayRecordInput[] {
  const daysInMonth = getDaysInMonth(year, month);
  const records: DayRecordInput[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateString(year, month, d);
    const employed = isEmployedOnDate(joiningDate, exitDate, dateStr);
    records.push({
      date: dateStr,
      status: employed ? (recordMap[dateStr] ?? null) : null,
      employed,
    });
  }

  return records;
}

export function countLeaveUsage(
  records: DayRecordInput[],
  { date, type }: { date: string; type: AttendanceStatus }
): number {
  if (type === "L") {
    const [weekStart, weekEnd] = getWeekRange(date);
    return records.filter(
      (r) =>
        r.status === "L" && r.date >= weekStart && r.date <= weekEnd && r.date !== date
    ).length;
  }

  if (type === "SL") {
    const year = date.slice(0, 4);
    return records.filter(
      (r) => r.status === "SL" && r.date.startsWith(year) && r.date !== date
    ).length;
  }

  return 0;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function formatTenure(joinDate: string, exitDate: string | null = null): string {
  const start = new Date(joinDate);
  const end = exitDate ? new Date(exitDate) : new Date();

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
  if (parts.length === 0) parts.push("Less than a month");

  return parts.join(" ");
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeStoredStatus(
  status: AttendanceStatus | null | undefined
): AttendanceStatus | null {
  if (status === null || status === undefined || status === "P") return null;
  return status;
}

export function formatStoredStatus(
  status: AttendanceStatus | null | undefined
): string {
  if (status === null || status === undefined || status === "P") {
    return "Present";
  }
  return STATUS_LABELS[status] ?? status;
}
