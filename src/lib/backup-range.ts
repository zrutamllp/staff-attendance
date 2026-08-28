import { getDaysInMonth, getWeekRange, toDateString } from "@/lib/attendance";
import { getLocalDateString } from "@/lib/auto-present";

export type BackupPeriod = "weekly" | "monthly" | "yearly";

export interface BackupRangeParams {
  period: BackupPeriod;
  year: number;
  month?: number;
  weekDate?: string;
}

export interface BackupDateRange {
  period: BackupPeriod;
  year: number;
  month?: number;
  weekStart?: string;
  weekEnd?: string;
  startDate: string;
  endDate: string;
}

export function getBackupDateRange(params: BackupRangeParams): BackupDateRange {
  const { period, year } = params;

  if (period === "yearly") {
    return {
      period,
      year,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  if (period === "monthly") {
    const month = params.month ?? 1;
    return {
      period,
      year,
      month,
      startDate: toDateString(year, month, 1),
      endDate: toDateString(year, month, getDaysInMonth(year, month)),
    };
  }

  const weekDate = params.weekDate || getLocalDateString();
  const [weekStart, weekEnd] = getWeekRange(weekDate);
  return {
    period,
    year,
    weekStart,
    weekEnd,
    startDate: weekStart,
    endDate: weekEnd,
  };
}

export function resolveBackupDateRange(data: Record<string, unknown>): BackupDateRange {
  if (
    data.startDate &&
    data.endDate &&
    typeof data.startDate === "string" &&
    typeof data.endDate === "string"
  ) {
    const period = (data.period as BackupPeriod) || "yearly";
    return {
      period,
      year: data.year as number,
      month: typeof data.month === "number" ? data.month : undefined,
      weekStart: typeof data.weekStart === "string" ? data.weekStart : undefined,
      weekEnd: typeof data.weekEnd === "string" ? data.weekEnd : undefined,
      startDate: data.startDate,
      endDate: data.endDate,
    };
  }

  const year = data.year as number;
  return getBackupDateRange({ period: "yearly", year });
}

export function formatBackupLabel(range: BackupDateRange): string {
  if (range.period === "weekly") {
    return `Week ${range.weekStart} – ${range.weekEnd}`;
  }
  if (range.period === "monthly" && range.month) {
    return `${range.year}-${String(range.month).padStart(2, "0")}`;
  }
  return String(range.year);
}

export function backupDownloadName(range: BackupDateRange): string {
  if (range.period === "weekly" && range.weekStart) {
    return `backup_weekly_${range.weekStart}.json`;
  }
  if (range.period === "monthly" && range.month) {
    return `backup_monthly_${range.year}-${String(range.month).padStart(2, "0")}.json`;
  }
  return `backup_yearly_${range.year}.json`;
}
